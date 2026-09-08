import { chromium, Browser, Page } from "playwright";
import { notFoundShopFor, portalShopList } from "../utils/portalShopList";
import {
    formatDate,
    mapColumns,
    parseCsv,
    portalTmpPath,
    readTabSeparatedText
} from "../utils/portalCsv";
import { postGateway, GatewayRow } from "../utils/postGateway";
import { closeBrowser, downloadCsvFile, NAVIGATION_TIMEOUT } from "../utils/portalPage";
import { sendErrorMail } from "./sendErrorMail";

type SuumoBrand = { id: string; pass: string; name: string };

const columnMapping: Record<string, string> = {
    資料請求日: "date_suumo",
    依頼番号: "id_suumo",
    "名前（漢字）氏": "sei_suumo",
    "名前（漢字）名": "mei_suumo",
    "名前（フリガナ等）氏": "sei_kana_suumo",
    "名前（フリガナ等）名": "mei_kana_suumo",
    年齢: "age_suumo",
    郵便番号: "zip_suumo",
    住所1: "address1_suumo",
    住所2: "address2_suumo",
    住所3: "address3_suumo",
    "E-mailアドレス": "mail_suumo",
    電話番号: "phone_suumo",
    建築予定時期: "period_suumo",
    "建設予定地（名称）": "place_suumo",
    "予算（土地予算除く）": "budget_suumo"
};

/**
 * 移植元 reloadSuumo.js と同じ店舗判定。
 * 建設予定地（place_suumo）で当たらなければ住所3（address3_suumo）で再判定し、
 * それでも当たらなければ「<ブランド>店舗未設定」とする。
 */
const resolveShop = (record: Record<string, string>, brand: string): string => {
    if (record["place_suumo"]) {
        const matched = portalShopList.find(
            shop => shop.brand === brand && record["place_suumo"].includes(shop.area)
        );
        if (matched) return matched.shop;
    }

    const fallback = portalShopList.find(
        shop => shop.brand === brand && record["address3_suumo"]?.includes(shop.area)
    );

    return fallback ? fallback.shop : notFoundShopFor(brand);
};

export const runSuumoOrder = async (): Promise<void> => {
    console.log("SUUMO（注文）スタート");

    const errors: string[] = [];

    const brands: SuumoBrand[] = [
        { id: process.env.SUUMO_ID_KH ?? "", pass: process.env.SUUMO_PASS_KH ?? "", name: "KH" },
        { id: process.env.SUUMO_ID_DJH ?? "", pass: process.env.SUUMO_PASS_DJH ?? "", name: "DJH" },
        { id: process.env.SUUMO_ID_NAGOMI ?? "", pass: process.env.SUUMO_PASS_NAGOMI ?? "", name: "Nagomi" }
    ];

    const loginEvent = async (page: Page, brand: SuumoBrand): Promise<void> => {
        page.setDefaultTimeout(NAVIGATION_TIMEOUT);
        await page.goto("https://www.housingnavi.jp/house/hj/operation/download/E_600.do", {
            waitUntil: "load",
            timeout: NAVIGATION_TIMEOUT
        });
        await page.fill(
            "//html/body/div/table/tbody/tr/td/div/form/table[2]/tbody/tr[2]/td/table/tbody/tr[1]/td[2]/input",
            brand.id
        );
        await page.fill(
            "//html/body/div/table/tbody/tr/td/div/form/table[2]/tbody/tr[2]/td/table/tbody/tr[2]/td[2]/input",
            brand.pass
        );
        await page.click(
            "//html/body/div/table/tbody/tr/td/div/form/table[2]/tbody/tr[2]/td/table/tbody/tr[6]/td/input"
        );
        await page.waitForLoadState("load");
        console.log(`${brand.name}_ログイン完了`);
    };

    const downloadCsv = async (page: Page, brand: string): Promise<GatewayRow[]> => {
        page.setDefaultTimeout(NAVIGATION_TIMEOUT);

        const today = new Date();
        // 1月は前年12月ではなく「01」を指定する移植元の挙動をそのまま維持する
        const targetMonth =
            today.getMonth() === 0
                ? String(today.getMonth() + 1).padStart(2, "0")
                : String(today.getMonth()).padStart(2, "0");

        await page.click("#T_014 > table:nth-child(2) > tbody > tr:nth-child(2) > td");
        await page.selectOption(
            "//html/body/div[2]/table/tbody/tr/td/form[2]/table[2]/tbody/tr[2]/td[1]/select[2]",
            targetMonth
        );
        await page.selectOption(
            "//html/body/div[2]/table/tbody/tr/td/form[2]/table[2]/tbody/tr[2]/td[1]/select[3]",
            "01"
        );
        await page.selectOption(
            "//html/body/div[2]/table/tbody/tr/td/form[2]/table[3]/tbody/tr/td/select",
            "2"
        );

        const fileName = await downloadCsvFile(page, {
            selector: "//html/body/div[2]/table/tbody/tr/td/form[2]/table[3]/tbody/tr/td/input",
            filePath: portalTmpPath(`${brand}_${formatDate(today)}suumo.txt`),
            label: `${brand}_SUUMO`,
            // 検索条件を指定する画面であり一覧ではないため 0 件判定は行わない
            checkEmpty: false
        });
        if (fileName === null) return [];

        console.log(`✅ ${fileName} を保存しました`);

        // SUUMO のダウンロードは Shift_JIS のタブ区切り。CSV として読めるようカンマへ置換する。
        const text = await readTabSeparatedText(fileName);
        const csvText = text
            .split("\n")
            .map(line => line.replace(/\t/g, ","))
            .join("\n");

        const records = parseCsv(csvText).map(row => mapColumns(row, columnMapping));

        return records.map(record => {
            if (record["date_suumo"]) {
                record["date_suumo"] = record["date_suumo"].replace(/\./g, "/");
            }
            record["shop_suumo"] = brand;
            record["shop"] = resolveShop(record, brand);
            return record as GatewayRow;
        });
    };

    let browser: Browser | undefined;
    const rows: GatewayRow[] = [];

    try {
        browser = await chromium.launch({ args: ["--no-sandbox"], headless: true });

        for (const brand of brands) {
            if (!brand.id || !brand.pass) {
                const msg = `${brand.name}_SUUMO_認証情報が未設定のためスキップしました`;
                errors.push(msg);
                console.log(msg);
                continue;
            }

            const context = await browser.newContext();
            const page = await context.newPage();

            try {
                await loginEvent(page, brand);
                rows.push(...await downloadCsv(page, brand.name));
            } catch (err) {
                const msg = `${brand.name}_SUUMO_取得失敗:${err}`;
                errors.push(msg);
                console.log(msg);
            } finally {
                await context.close();
            }
        }
    } catch (err) {
        const msg = `SUUMO_ブラウザ起動に失敗:${err}`;
        errors.push(msg);
        console.error(msg);
    } finally {
        await closeBrowser(browser);
    }

    if (rows.length > 0) {
        const result = await postGateway("suumo_db_order", rows);
        errors.push(...result.errors.map(e => `SUUMO_送信失敗: ${e}`));
    }

    await sendErrorMail(errors, "runSuumoOrder.ts");
};

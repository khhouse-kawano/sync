import { chromium, Browser, Page } from "playwright";
import { readFile } from "fs/promises";
import { portalShopList } from "../utils/portalShopList";
import { formatDate, mapColumns, parseCsv, portalTmpPath } from "../utils/portalCsv";
import { postGateway, GatewayRow } from "../utils/postGateway";
import { sendErrorMail } from "./sendErrorMail";

/** ブランドごとの選択ボタン XPath（ログイン後のアカウント切り替え） */
type AllgritBrand = { selector: string; name: string };

const columnMapping: Record<string, string> = {
    お客様LINEUID: "id_allGrit",
    LINE登録日: "date_allGrit",
    リードステータス: "status_allGrit",
    姓: "sei_allGrit",
    名: "mei_allGrit",
    フリガナ: "kana_allGrit",
    連絡先メールアドレス: "mail_allGrit",
    電話番号: "phone_allGrit",
    郵便番号: "zip_allGrit",
    住所: "address1_allGrit",
    予算: "budget_allGrit",
    希望エリアの都道府県: "pref_allGrit",
    希望エリアの市区町村第1希望: "city_allGrit",
    希望エリアの市区町村第2希望: "city_allGrit2",
    希望エリアの市区町村第3希望: "city_allGrit3",
    "建築予定地（市区町村）": "place_homes",
    来店予約: "reservation"
};

/**
 * 移植元 reloadAllgrit.js の取り込み条件。
 * 来店予約あり・資料郵送後・アンケート回答後のいずれかで、かつ姓が入力済みのものを対象とする。
 */
const isTargetRecord = (record: Record<string, string>): boolean => {
    const status = record["status_allGrit"] ?? "";
    const sei = record["sei_allGrit"] ?? "";
    const mei = record["mei_allGrit"] ?? "";

    const statusMatched =
        record["reservation"] === "1" ||
        status === "資料郵送後" ||
        status.includes("アンケート回答後");

    return (
        statusMatched &&
        sei !== "" &&
        (!sei.includes("テスト") || !mei.includes("テスト"))
    );
};

/**
 * 移植元と同じ店舗判定。
 * 希望エリアの市区町村第1希望で当たらなければ住所で再判定する。
 */
const resolveShop = (record: Record<string, string>, brand: string): string => {
    if (record["city_allGrit"]) {
        const matched = portalShopList.find(
            shop => shop.brand === brand && record["city_allGrit"].includes(shop.area)
        );
        if (matched) return matched.shop;
    }

    const fallback = portalShopList.find(
        shop => shop.brand === brand && record["address1_allGrit"]?.includes(shop.area)
    );

    return fallback ? fallback.shop : `${brand.replace("Nagomi", "なごみ")}店舗未設定`;
};

export const runAllgritOrder = async (): Promise<void> => {
    console.log("ALLGRIT（注文）スタート");

    const errors: string[] = [];

    const brands: AllgritBrand[] = [
        {
            selector:
                "//html/body/div[2]/div/div/div/main/div/div/div/div/div/div[2]/div[1]/div[3]/button",
            name: "KH"
        },
        {
            selector:
                "//html/body/div[2]/div/div/div/main/div/div/div/div/div/div[2]/div[3]/div[3]/button",
            name: "DJH"
        }
    ];

    const id = process.env.ALLGRIT_ORDER_ID ?? "";
    const pass = process.env.ALLGRIT_ORDER_PASS ?? "";

    const loginEvent = async (page: Page): Promise<void> => {
        page.setDefaultTimeout(120000);
        await page.goto("https://line-saas.auka.jp/builder/login");
        await page.fill(
            "//html/body/div[2]/div/div/div/main/div/div[1]/div/div/div/div/div[3]/form/div[1]/div/div[1]/div/input",
            id
        );
        await page.fill(
            "//html/body/div[2]/div/div/div/main/div/div[1]/div/div/div/div/div[3]/form/div[2]/div/div[1]/div/input",
            pass
        );
        await page.click(
            "//html/body/div[2]/div/div/div/main/div/div[1]/div/div/div/div/div[3]/form/div[3]/button/span"
        );
        await page.waitForLoadState("load");
        console.log("ログイン完了");
    };

    const downloadCsv = async (page: Page, brand: AllgritBrand): Promise<GatewayRow[]> => {
        page.setDefaultTimeout(120000);
        console.log(`${brand.name}_スタート`);

        await page.waitForLoadState("load");
        await page.click(brand.selector);
        await page.click("//html/body/div[2]/div/div/div/div[1]/nav/div[1]/div/div/div[1]/div"); // 左上メニュー
        await page.click("//html/body/div[2]/div/div/div/div[1]/div/div/a[2]"); // お客様一覧
        await page.waitForLoadState("load");

        const downloadPromise = page.waitForEvent("download");
        await page.waitForLoadState("load");
        await page.click(
            "//html/body/div[2]/div/div/div/main/div/div/div/div[1]/div/div[3]/div[4]/button[4]/span" // ダウンロードボタン
        );
        const download = await downloadPromise;

        const filePath = portalTmpPath(`${brand.name}_${formatDate(new Date())}ALLGRIT.csv`);
        await download.saveAs(filePath);

        const records = parseCsv(await readFile(filePath, "utf8")).map(row =>
            mapColumns(row, columnMapping)
        );

        const rows = records.filter(isTargetRecord).map(record => {
            // 移植元は LINE 登録日を「取り込んだ当日」で上書きしている
            if (record["date_allGrit"]) {
                const now = new Date();
                record["date_allGrit"] = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
            }
            record["shop_allGrit"] = brand.name;
            record["shop"] = resolveShop(record, brand.name);
            return record as GatewayRow;
        });

        // アカウント選択画面へ戻し、次のブランドを処理できる状態にする
        await page.click(
            "#app > div > header > div > button.px-0.v-btn.v-btn--has-bg.theme--light.v-size--default",
            { force: true }
        );
        await page.goto("https://line-saas.auka.jp/builder/");

        return rows;
    };

    let browser: Browser | undefined;
    const rows: GatewayRow[] = [];

    if (!id || !pass) {
        const msg = "ALLGRIT_認証情報（ALLGRIT_ORDER_ID / ALLGRIT_ORDER_PASS）が未設定です";
        errors.push(msg);
        console.log(msg);
        await sendErrorMail(errors, "runAllgritOrder.ts");
        return;
    }

    try {
        browser = await chromium.launch({ args: ["--no-sandbox"], headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        await loginEvent(page);

        for (const brand of brands) {
            try {
                rows.push(...await downloadCsv(page, brand));
            } catch (err) {
                const msg = `${brand.name}_オールグリット_ダウンロード失敗:${err}`;
                errors.push(msg);
                console.log(msg);
            }
        }
    } catch (err) {
        const msg = `ALLGRIT_処理に失敗:${err}`;
        errors.push(msg);
        console.error(msg);
    } finally {
        if (browser) await browser.close();
    }

    if (rows.length > 0) {
        const result = await postGateway("allgrit_db_order", rows);
        errors.push(...result.errors.map(e => `ALLGRIT_送信失敗: ${e}`));
    }

    await sendErrorMail(errors, "runAllgritOrder.ts");
};

import { chromium, Browser, Page } from "playwright";
import { portalShopList } from "../utils/portalShopList";
import { modelHouseList } from "../utils/modelHouseList";
import { formatDate, mapColumns, parseCsv, portalTmpPath, readSjisText } from "../utils/portalCsv";
import { postGateway, GatewayRow } from "../utils/postGateway";
import { sendErrorMail } from "./sendErrorMail";

type HomesBrand = { id: string; pass: string; name: string };

/** 問合せメール一覧の CSV ヘッダー */
const inquiryColumnMapping: Record<string, string> = {
    問合せ番号: "id_homes",
    問合せ日時: "date_homes",
    氏名: "name_homes",
    シメイ: "kana_homes",
    郵便番号: "zip_homes",
    住所: "address_homes",
    メールアドレス: "mail_homes",
    電話番号: "phone_homes",
    建設予定時期: "period_homes",
    土地所有の有無: "estate_homes",
    現在の検討状況: "status_homes",
    建築予算: "budget_detail_homes",
    世帯年収: "income_homes",
    年齢: "age_homes",
    "建築予定地（市区町村）": "place_homes"
};

/** 来場予約一覧の CSV ヘッダー（列の意味が異なるが、格納先カラムは移植元と同じ） */
const reservationColumnMapping: Record<string, string> = {
    来場予約問合せ番号: "id_homes",
    問合せ日時: "date_homes",
    お名前: "name_homes",
    郵便番号: "zip_homes",
    住所: "address_homes",
    メールアドレス: "mail_homes",
    電話番号: "phone_homes",
    土地の有無: "estate_homes",
    現在の検討状況: "status_homes",
    建築予算: "budget_detail_homes",
    来場先: "income_homes",
    問合せ種別: "age_homes",
    "建築予定地（市区町村）": "place_homes"
};

/** 来場予約の問合せ番号に付ける接頭辞（問合せメールとの採番衝突を避けるため） */
const RESERVATION_ID_PREFIX = "reserve_";

const notFoundShop = (brand: string): string => `${brand.replace("Nagomi", "なごみ")}店舗未設定`;

const downloadTo = async (page: Page, url: string, fileName: string): Promise<string> => {
    await page.goto(url);
    const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 30000 }),
        page.click("//html/body/div[2]/div[2]/div[2]/div[2]/div/form/div/p/button")
    ]);
    const filePath = portalTmpPath(fileName);
    await download.saveAs(filePath);
    return filePath;
};

export const runHomesOrder = async (): Promise<void> => {
    console.log("HOME'S（注文）スタート");

    const errors: string[] = [];

    const brands: HomesBrand[] = [
        { id: process.env.HOMES_ID_KH ?? "", pass: process.env.HOMES_PASS_KH ?? "", name: "KH" },
        { id: process.env.HOMES_ID_DJH ?? "", pass: process.env.HOMES_PASS_DJH ?? "", name: "DJH" },
        { id: process.env.HOMES_ID_JH ?? "", pass: process.env.HOMES_PASS_JH ?? "", name: "JH" },
        { id: process.env.HOMES_ID_PGH ?? "", pass: process.env.HOMES_PASS_PGH ?? "", name: "PG HOUSE" }
    ];

    const loginEvent = async (page: Page, brand: HomesBrand): Promise<void> => {
        page.setDefaultTimeout(30000);
        // 移植元同様、ログイン画面は不安定なため最大3回まで遷移を試みる
        for (let i = 0; i < 3; i++) {
            try {
                const res = await page.goto("https://iezukuri-manager.homes.co.jp/login", {
                    waitUntil: "networkidle",
                    timeout: 60000
                });
                if (res && res.ok()) break;
            } catch (err) {
                console.error(`${brand.name}_ログイン画面への遷移を再試行します:`, err);
            }
        }
        await page.fill("//html/body/div[2]/div/div/div/form/div/dl/dd[1]/input", brand.id);
        await page.fill("//html/body/div[2]/div/div/div/form/div/dl/dd[2]/input", brand.pass);
        await page.click("//html/body/div[2]/div/div/div/form/div/div/div/button");
        await page.waitForLoadState("networkidle");
        console.log(`${brand.name}_ログイン成功`);
    };

    /** 問合せメール一覧：建築予定地→住所の順で店舗を判定する */
    const downloadInquiryCsv = async (page: Page, brand: string): Promise<GatewayRow[]> => {
        const today = new Date();
        const filePath = await downloadTo(
            page,
            "https://iezukuri-manager.homes.co.jp/inquire/mail",
            `${brand}_${formatDate(today)}homes.csv`
        );

        const records = parseCsv(await readSjisText(filePath)).map(row =>
            mapColumns(row, inquiryColumnMapping)
        );

        return records.map(record => {
            record["shop_homes"] = brand;
            if (record["date_homes"]) {
                record["date_homes"] = record["date_homes"].replace(/年|月/g, "/").replace("日", "");
            }

            let matched = record["place_homes"]
                ? portalShopList.find(
                      shop => shop.brand === brand && record["place_homes"].includes(shop.area)
                  )
                : undefined;
            if (!matched) {
                matched = portalShopList.find(
                    shop => shop.brand === brand && record["address_homes"]?.includes(shop.area)
                );
            }
            record["shop"] = matched ? matched.shop : notFoundShop(brand);
            return record as GatewayRow;
        });
    };

    /**
 * 来場予約一覧：来場先（income_homes）とモデルハウス名の完全一致で店舗を判定する。
 *
 * 「来場予約問合せ番号」は問合せメールの「問合せ番号」とは別採番のため、
 * 番号が偶然一致すると homes_db / inquiry_customer で衝突して上書きされてしまう。
 * これを避けるため、来場予約側の id_homes には reserve_ を付けて区別する。
 */
    const downloadReservationCsv = async (page: Page, brand: string): Promise<GatewayRow[]> => {
        const today = new Date();
        const filePath = await downloadTo(
            page,
            "https://iezukuri-manager.homes.co.jp/visit_reservation",
            `${brand}_${formatDate(today)}homes_reservation.csv`
        );

        const records = parseCsv(await readSjisText(filePath)).map(row =>
            mapColumns(row, reservationColumnMapping)
        );

        return records.map(record => {
            record["shop_homes"] = brand;
            if (record["date_homes"]) {
                record["date_homes"] = record["date_homes"].replace(/年|月/g, "/").replace("日", "");
            }
            if (record["id_homes"]) {
                record["id_homes"] = `${RESERVATION_ID_PREFIX}${record["id_homes"]}`;
            }

            const matched = modelHouseList.find(
                house => house.brand === brand && record["income_homes"] === house.modelhouse
            );
            record["shop"] = matched ? matched.shop : notFoundShop(brand);
            return record as GatewayRow;
        });
    };

    let browser: Browser | undefined;
    const rows: GatewayRow[] = [];

    try {
        browser = await chromium.launch({ args: ["--no-sandbox"], headless: true });

        for (const brand of brands) {
            if (!brand.id || !brand.pass) {
                const msg = `${brand.name}_HOME'S_認証情報が未設定のためスキップしました`;
                errors.push(msg);
                console.log(msg);
                continue;
            }

            const context = await browser.newContext();
            const page = await context.newPage();

            try {
                await loginEvent(page, brand);
            } catch (err) {
                const msg = `${brand.name}_ログイン失敗:${err}`;
                errors.push(msg);
                console.log(msg);
                await context.close();
                continue;
            }

            try {
                rows.push(...await downloadInquiryCsv(page, brand.name));
            } catch (err) {
                const msg = `${brand.name}_問合せ一覧ダウンロード失敗:${err}`;
                errors.push(msg);
                console.log(msg);
            }

            try {
                rows.push(...await downloadReservationCsv(page, brand.name));
            } catch (err) {
                const msg = `${brand.name}_来場予約一覧ダウンロード失敗:${err}`;
                errors.push(msg);
                console.log(msg);
            }

            await context.close();
        }
    } catch (err) {
        const msg = `HOME'S_ブラウザ起動に失敗:${err}`;
        errors.push(msg);
        console.error(msg);
    } finally {
        if (browser) await browser.close();
    }

    if (rows.length > 0) {
        const result = await postGateway("homes_db_order", rows);
        errors.push(...result.errors.map(e => `HOME'S_送信失敗: ${e}`));
    }

    await sendErrorMail(errors, "runHomesOrder.ts");
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTownlifeOrder = void 0;
const playwright_1 = require("playwright");
const portalShopList_1 = require("../utils/portalShopList");
const portalCsv_1 = require("../utils/portalCsv");
const postGateway_1 = require("../utils/postGateway");
const portalPage_1 = require("../utils/portalPage");
const sendErrorMail_1 = require("./sendErrorMail");
const columnMapping = {
    問い合わせID: "id_townlife",
    顧客氏名: "name_townlife",
    ふりがな: "kana_townlife",
    年齢: "age_townlife",
    郵便番号: "zip_townlife",
    住所都道府県: "pref_townlife",
    住所市区町村: "city_townlife",
    住所詳細: "address_townlife",
    メールアドレス: "mail_townlife",
    電話番号: "phone_townlife",
    建設予定地: "place_townlife",
    建設予定地詳細: "place_detail_townlife",
    希望階数: "floor_townlife",
    "予定人数（大人）": "adult_townlife",
    "予定人数（子ども）": "child_townlife",
    "間取り（LDK）": "ldk_townlife",
    建物予算: "budget_townlife",
    土地の大きさ: "large_townlife",
    土地予算: "budget_estate_townlife",
    土地に関するご希望: "demand_estate_townlife",
    "敷地図・土地図面等の添付": "image_townlife",
    家のこだわり: "demand_house_townlife",
    その他: "note_townlife",
    お問合せ日時: "response_date_townlife",
    店舗: "shop_townlife",
    状況: "status_townlife"
};
/**
 * 移植元 reloadTownlife.js と同じ店舗判定。
 * 建設予定地詳細で当たらなければ住所市区町村で再判定する。
 */
const resolveShop = (record, brand) => {
    if (record["place_detail_townlife"]) {
        const matched = portalShopList_1.portalShopList.find(shop => shop.brand === brand && record["place_detail_townlife"].includes(shop.area));
        if (matched)
            return matched.shop;
    }
    const fallback = portalShopList_1.portalShopList.find(shop => shop.brand === brand && record["city_townlife"]?.includes(shop.area));
    return fallback ? fallback.shop : (0, portalShopList_1.notFoundShopFor)(brand);
};
const runTownlifeOrder = async () => {
    console.log("タウンライフ（注文）スタート");
    const errors = [];
    const brands = [
        { id: process.env.TOWNLIFE_ID_KH ?? "", pass: process.env.TOWNLIFE_PASS_KH ?? "", name: "KH" },
        { id: process.env.TOWNLIFE_ID_DJH ?? "", pass: process.env.TOWNLIFE_PASS_DJH ?? "", name: "DJH" },
        { id: process.env.TOWNLIFE_ID_NAGOMI ?? "", pass: process.env.TOWNLIFE_PASS_NAGOMI ?? "", name: "Nagomi" },
        { id: process.env.TOWNLIFE_ID_PGH ?? "", pass: process.env.TOWNLIFE_PASS_PGH ?? "", name: "PG HOUSE" },
        { id: process.env.TOWNLIFE_ID_JH ?? "", pass: process.env.TOWNLIFE_PASS_JH ?? "", name: "JH" }
    ];
    const loginEvent = async (page, brand) => {
        page.setDefaultTimeout(portalPage_1.NAVIGATION_TIMEOUT);
        await page.goto("https://www.town-life.jp/home/kanri/", {
            waitUntil: "load",
            timeout: portalPage_1.NAVIGATION_TIMEOUT
        });
        await page.fill("#login", brand.id);
        await page.fill("#pw", brand.pass);
        await page.click("#main_container > div.login_form > div > form > fieldset > dl.submit > input[type=button]");
        await page.waitForLoadState("load");
        console.log(`${brand.name}_ログイン完了`);
    };
    const downloadCsv = async (page, brand) => {
        page.setDefaultTimeout(portalPage_1.NAVIGATION_TIMEOUT);
        const filePath = await (0, portalPage_1.downloadCsvFile)(page, {
            url: "https://www.town-life.jp/home/kanri/index.php?action_AdminInquiryList=true",
            selector: "#main_container > div.main_content > div.center_content > form:nth-child(4) > div.btnArea > input[type=button]",
            filePath: (0, portalCsv_1.portalTmpPath)(`${brand}_${(0, portalCsv_1.formatDate)(new Date())}townlife.csv`),
            label: `${brand}_タウンライフ`
        });
        if (filePath === null)
            return [];
        const records = (0, portalCsv_1.parseCsv)(await (0, portalCsv_1.readSjisText)(filePath)).map(row => (0, portalCsv_1.mapColumns)(row, columnMapping));
        return records
            .filter(record => record["name_townlife"] !== "取消処理されました")
            .map(record => {
            record["brand"] = brand;
            record["shop_townlife"] = brand;
            if (record["response_date_townlife"]) {
                record["response_date_townlife"] = record["response_date_townlife"]
                    .replace(/-/g, "/")
                    .split(" ")[0];
            }
            // タウンライフの CSV は Excel 由来の ="..." 装飾が混入するため取り除く
            record["address_townlife"] = (0, portalCsv_1.stripExcelFormula)(record["address_townlife"]);
            record["phone_townlife"] = (0, portalCsv_1.stripExcelFormula)(record["phone_townlife"]);
            record["zip_townlife"] = (0, portalCsv_1.stripExcelFormula)(record["zip_townlife"]);
            record["shop"] = resolveShop(record, brand);
            return record;
        });
    };
    let browser;
    const rows = [];
    try {
        browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"], headless: true });
        for (const brand of brands) {
            if (!brand.id || !brand.pass) {
                const msg = `${brand.name}_タウンライフ_認証情報が未設定のためスキップしました`;
                errors.push(msg);
                console.log(msg);
                continue;
            }
            const context = await browser.newContext();
            const page = await context.newPage();
            try {
                await loginEvent(page, brand);
                rows.push(...await downloadCsv(page, brand.name));
            }
            catch (err) {
                const msg = `${brand.name}_タウンライフ_取得失敗:${err}`;
                errors.push(msg);
                console.log(msg);
            }
            finally {
                await context.close();
            }
        }
    }
    catch (err) {
        const msg = `タウンライフ_ブラウザ起動に失敗:${err}`;
        errors.push(msg);
        console.error(msg);
    }
    finally {
        await (0, portalPage_1.closeBrowser)(browser);
    }
    if (rows.length > 0) {
        const result = await (0, postGateway_1.postGateway)("townlife_db_order", rows);
        errors.push(...result.errors.map(e => `タウンライフ_送信失敗: ${e}`));
    }
    await (0, sendErrorMail_1.sendErrorMail)(errors, "runTownlifeOrder.ts");
};
exports.runTownlifeOrder = runTownlifeOrder;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSuumoOrder = void 0;
const playwright_1 = require("playwright");
const portalShopList_1 = require("../utils/portalShopList");
const portalCsv_1 = require("../utils/portalCsv");
const postGateway_1 = require("../utils/postGateway");
const portalPage_1 = require("../utils/portalPage");
const sendErrorMail_1 = require("./sendErrorMail");
const columnMapping = {
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
const resolveShop = (record, brand) => {
    if (record["place_suumo"]) {
        const matched = portalShopList_1.portalShopList.find(shop => shop.brand === brand && record["place_suumo"].includes(shop.area));
        if (matched)
            return matched.shop;
    }
    const fallback = portalShopList_1.portalShopList.find(shop => shop.brand === brand && record["address3_suumo"]?.includes(shop.area));
    return fallback ? fallback.shop : (0, portalShopList_1.notFoundShopFor)(brand);
};
const runSuumoOrder = async () => {
    console.log("SUUMO（注文）スタート");
    const errors = [];
    const brands = [
        { id: process.env.SUUMO_ID_KH ?? "", pass: process.env.SUUMO_PASS_KH ?? "", name: "KH" },
        { id: process.env.SUUMO_ID_DJH ?? "", pass: process.env.SUUMO_PASS_DJH ?? "", name: "DJH" },
        { id: process.env.SUUMO_ID_NAGOMI ?? "", pass: process.env.SUUMO_PASS_NAGOMI ?? "", name: "Nagomi" }
    ];
    const loginEvent = async (page, brand) => {
        page.setDefaultTimeout(portalPage_1.NAVIGATION_TIMEOUT);
        await page.goto("https://www.housingnavi.jp/house/hj/operation/download/E_600.do", {
            waitUntil: "load",
            timeout: portalPage_1.NAVIGATION_TIMEOUT
        });
        await page.fill("//html/body/div/table/tbody/tr/td/div/form/table[2]/tbody/tr[2]/td/table/tbody/tr[1]/td[2]/input", brand.id);
        await page.fill("//html/body/div/table/tbody/tr/td/div/form/table[2]/tbody/tr[2]/td/table/tbody/tr[2]/td[2]/input", brand.pass);
        await page.click("//html/body/div/table/tbody/tr/td/div/form/table[2]/tbody/tr[2]/td/table/tbody/tr[6]/td/input");
        await page.waitForLoadState("load");
        console.log(`${brand.name}_ログイン完了`);
    };
    const downloadCsv = async (page, brand) => {
        page.setDefaultTimeout(portalPage_1.NAVIGATION_TIMEOUT);
        const today = new Date();
        // 1月は前年12月ではなく「01」を指定する移植元の挙動をそのまま維持する
        const targetMonth = today.getMonth() === 0
            ? String(today.getMonth() + 1).padStart(2, "0")
            : String(today.getMonth()).padStart(2, "0");
        await page.click("#T_014 > table:nth-child(2) > tbody > tr:nth-child(2) > td");
        await page.selectOption("//html/body/div[2]/table/tbody/tr/td/form[2]/table[2]/tbody/tr[2]/td[1]/select[2]", targetMonth);
        await page.selectOption("//html/body/div[2]/table/tbody/tr/td/form[2]/table[2]/tbody/tr[2]/td[1]/select[3]", "01");
        await page.selectOption("//html/body/div[2]/table/tbody/tr/td/form[2]/table[3]/tbody/tr/td/select", "2");
        const fileName = await (0, portalPage_1.downloadCsvFile)(page, {
            selector: "//html/body/div[2]/table/tbody/tr/td/form[2]/table[3]/tbody/tr/td/input",
            filePath: (0, portalCsv_1.portalTmpPath)(`${brand}_${(0, portalCsv_1.formatDate)(today)}suumo.txt`),
            label: `${brand}_SUUMO`,
            // 検索条件を指定する画面であり一覧ではないため 0 件判定は行わない
            checkEmpty: false
        });
        if (fileName === null)
            return [];
        console.log(`✅ ${fileName} を保存しました`);
        // SUUMO のダウンロードは Shift_JIS のタブ区切り。CSV として読めるようカンマへ置換する。
        const text = await (0, portalCsv_1.readTabSeparatedText)(fileName);
        const csvText = text
            .split("\n")
            .map(line => line.replace(/\t/g, ","))
            .join("\n");
        const records = (0, portalCsv_1.parseCsv)(csvText).map(row => (0, portalCsv_1.mapColumns)(row, columnMapping));
        return records.map(record => {
            if (record["date_suumo"]) {
                record["date_suumo"] = record["date_suumo"].replace(/\./g, "/");
            }
            record["shop_suumo"] = brand;
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
            }
            catch (err) {
                const msg = `${brand.name}_SUUMO_取得失敗:${err}`;
                errors.push(msg);
                console.log(msg);
            }
            finally {
                await context.close();
            }
        }
    }
    catch (err) {
        const msg = `SUUMO_ブラウザ起動に失敗:${err}`;
        errors.push(msg);
        console.error(msg);
    }
    finally {
        await (0, portalPage_1.closeBrowser)(browser);
    }
    if (rows.length > 0) {
        const result = await (0, postGateway_1.postGateway)("suumo_db_order", rows);
        errors.push(...result.errors.map(e => `SUUMO_送信失敗: ${e}`));
    }
    await (0, sendErrorMail_1.sendErrorMail)(errors, "runSuumoOrder.ts");
};
exports.runSuumoOrder = runSuumoOrder;

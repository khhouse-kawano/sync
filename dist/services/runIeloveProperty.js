"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runIeloveProperty = void 0;
const playwright_1 = require("playwright");
const errors = [];
const sync_1 = require("csv-parse/sync");
const axios_1 = __importDefault(require("axios"));
const sendErrorMail_1 = require("./sendErrorMail");
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const fs = __importStar(require("fs"));
// 日本語ヘッダー列を英語キーに変換する辞書
const propertyHeaderMap = {
    "物件番号": "property_id",
    "管理コード": "management_code",
    "担当店舗名": "store_name",
    "物件担当者": "property_staff",
    "取引態様": "transaction_type",
    "物件種別": "property_type",
    "所在地": "address",
    "物件名": "property_name",
    "空き物件内容（部屋番号）": "room_number",
    "土地面積": "land_area",
    "建物面積": "building_area",
    "間取り": "layout",
    "築年数": "building_age",
    "価格": "price",
    "表面利回り": "gross_yield",
    "交通1": "transportation",
    "取扱業者": "agency",
    "担当者": "staff_in_charge",
    "電話番号": "tel",
    "活動報告日": "report_date",
    "活動報告予定日": "next_report_date",
    "想定利回り": "expected_yield",
    "総戸数・総区画数": "total_units",
    "建物構造": "structure",
    "用途地域": "zoning",
    "用途地域2": "zoning_2",
    "売主": "seller",
    "所有者": "owner",
    "価格(単位なし)": "price_raw",
    "実需・投資": "investment_type",
    "掲載期限": "expiry_date",
    "物件掲載指示": "publishing_instruction",
    "社内用メモ１": "internal_note"
};
const postToPhpApi = async (data) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        data: data,
        request: 'property_db_update'
    };
    try {
        const response = await axios_1.default.post(API_URL, payload, { headers: { "Content-Type": "application/json" } });
        console.log("DB登録成功:", response.data);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error(`APIエラー: ${error.response?.status} ${error.response?.statusText}`);
            console.error("エラー詳細:", error.response?.data);
            errors.push(`API送信エラー: ${error.response?.status}`);
        }
        else {
            console.error("API送信中に予期せぬエラーが発生しました:", error);
            errors.push(`API予期せぬエラー`);
        }
    }
};
const runIeloveProperty = async (ielove_id, ielove_pass) => {
    const browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"], headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const login = async () => {
        try {
            await page.goto('https://cloud.ielove.jp/');
            await page.waitForLoadState("networkidle");
            await page.fill('xpath=/html/body/div[2]/article/div/section[2]/div[1]/dl/form/dd/ul/li[1]/input', ielove_id);
            await page.fill('xpath=/html/body/div[2]/article/div/section[2]/div[1]/dl/form/dd/ul/li[2]/input', ielove_pass);
            await page.click('xpath=/html/body/div[2]/article/div/section[2]/div[1]/dl/form/dd/p');
            await page.waitForLoadState("networkidle");
        }
        catch (err) {
            const msg = `ログイン処理に失敗${err}`;
            console.log(msg);
            errors.push(msg);
            throw err; // ログイン失敗時は以降の処理を止める
        }
    };
    const propertySearch = async () => {
        // 店舗ID（value値）の配列
        const storeIds = ["86679", "96031", "150319"];
        for (const storeId of storeIds) {
            console.log(`=== 店舗ID: ${storeId} の処理を開始します ===`);
            try {
                const targetUrl = `https://cloud.ielove.jp/sale/index/index/num/500/search/1/scow/0/sccm/0/renmm/0/spdtm/1/kcdt/0/scld/0/grid/${storeId}/notAddBknTo/0/udcdr/1/ttcd1/0/ttcd2/0/ttcd3/0/ttcd4/0/ttcd5/0/ttcd8/0/ttcd99/0/kyzk/0/ptcm/0/exun/0/ices/2/exes/1/pbst/1/past/1/ipco/0/dluf/0/buda/0/ortgr/1/optt/1/`;
                await page.goto(targetUrl);
                await page.waitForLoadState("networkidle");
                await page.waitForTimeout(2000);
                // 一覧をダウンロードボタンのクリック
                const downloadBtn = page.locator('#listDownloadFooter');
                await downloadBtn.waitFor({ state: 'visible' });
                await downloadBtn.click();
                // CSV形式でダウンロードボタンのクリック
                const csvBtn = page.locator('#bukkaku_csv_download');
                await csvBtn.waitFor({ state: 'visible' });
                // ダウンロードイベントのキャッチ
                const [download] = await Promise.all([
                    page.waitForEvent('download'),
                    csvBtn.click()
                ]);
                const filePath = await download.path();
                if (!filePath) {
                    throw new Error(`店舗ID: ${storeId} のファイルダウンロードに失敗しました`);
                }
                // Shift-JISからUTF-8に変換
                const buffer = fs.readFileSync(filePath);
                let utf8CsvText = iconv_lite_1.default.decode(buffer, 'Shift_JIS');
                // エクセルのゼロ落ち防止用フォーマットを強制クリーニング
                utf8CsvText = utf8CsvText.replace(/="/g, '"');
                const records = (0, sync_1.parse)(utf8CsvText, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true
                });
                // 取得日 (yyyy/mm/dd)
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const registeredDate = `${yyyy}/${mm}/${dd}`;
                const finalRecords = [];
                for (const record of records) {
                    const mappedRecord = {};
                    for (const [jaKey, value] of Object.entries(record)) {
                        if (jaKey.startsWith('オリジナル項目'))
                            continue;
                        const enKey = propertyHeaderMap[jaKey];
                        if (enKey) {
                            mappedRecord[enKey] = value;
                        }
                    }
                    mappedRecord['registered'] = registeredDate;
                    finalRecords.push(mappedRecord);
                }
                console.log(`[店舗: ${storeId}] 抽出・マッピング完了: ${finalRecords.length} 件のデータをAPIへ送信します。`);
                // API送信
                if (finalRecords.length > 0) {
                    await postToPhpApi(finalRecords);
                }
            }
            catch (err) {
                const msg = `[店舗: ${storeId}] の処理中にエラーが発生しました: ${err}`;
                console.error(msg);
                errors.push(msg);
                // エラーが起きても continue で次の店舗の処理へ進む
            }
        }
    };
    try {
        await login();
        await propertySearch();
    }
    catch (e) {
        console.error("致命的なエラーにより処理を中断しました", e);
    }
    finally {
        // ブラウザを確実に閉じる
        await browser.close();
        await (0, sendErrorMail_1.sendErrorMail)(errors, 'runIeloveProperty.ts');
    }
};
exports.runIeloveProperty = runIeloveProperty;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSumaiStep = void 0;
const playwright_1 = require("playwright");
const fs_1 = __importDefault(require("fs"));
const encoding_japanese_1 = __importDefault(require("encoding-japanese"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const axios_1 = __importDefault(require("axios"));
const sendErrorMail_1 = require("./sendErrorMail");
const errors = [];
const runSumaiStep = async (id, pass) => {
    let browser;
    const fileName = "/tmp/data_sumaistep.csv";
    try {
        console.log("すまいステップからのCSVダウンロードを開始します...");
        browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"], headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto("https://sumai-step.com/partner/conversions");
        await page.fill("#partner_email", id);
        await page.fill("#partner_password", pass);
        await page.click("#new_partner > div:nth-child(5) > div > input");
        await page.waitForLoadState("domcontentloaded");
        await page.goto("https://sumai-step.com/partner/conversions");
        const [download] = await Promise.all([
            page.waitForEvent("download"),
            page.click("body > main > div > div > div:nth-child(4) > div > div:nth-child(1) > form > button")
        ]);
        await download.saveAs(fileName);
        console.log("ダウンロード完了。ブラウザを終了します。");
        await browser.close();
        const sjisBuffer = fs_1.default.readFileSync(fileName);
        const unicodeArray = encoding_japanese_1.default.convert(sjisBuffer, {
            to: "UNICODE",
            from: "SJIS",
        });
        const unicodeString = encoding_japanese_1.default.codeToString(unicodeArray);
        fs_1.default.writeFileSync(fileName, unicodeString);
        console.log("文字コードをUNICODEに変換しました。");
        const columnMapping = {
            管理番号: "id",
            反響日時: "date",
            状態: "status",
            担当店舗: "shop",
            物件種別: "estate",
            "物件種別：その他": "category",
            "物件住所：都道府県": "estate_pref",
            "物件住所：市区町村": "estate_city",
            "物件住所：町名": "estate_town",
            "物件住所：字/丁目以降": "estate_street",
            "物件住所：建物名": "estate_building",
            "物件住所：号室": "estate_room",
            物件にお住まい: "estate_situation",
            専有面積: "large_1",
            "専有面積（単位）": "large_2",
            延べ床面積: "large_3",
            "延べ床面積（単位）": "large_4",
            土地面積: "land_large_1",
            "土地面積（単位）": "land_large_2",
            築年: "land_large_3",
            間取り: "plan",
            現在の状況: "situation",
            物件の関係: "relationship",
            賃料: "rent",
            階数: "floor",
            "戸数（部屋数）": "room",
            査定の理由: "reason",
            "査定の理由：その他": "reason_other",
            査定の方法: "method",
            売却の希望時期: "period",
            "ご要望・ご質問": "opinion",
            "氏名 姓": "sei",
            "氏名 名": "mei",
            "フリガナ 姓": "sei_kana",
            "フリガナ 名": "mei_kana",
            年齢: "age",
            電話番号: "phone",
            メールアドレス: "mail",
            郵便番号: "zip",
            "お住まいの住所：都道府県、市区町村、町名": "address_1",
            "お住まいの住所：字/丁目以降": "address_2",
            "お住まいの住所：建物名、号室": "address_3",
            通電: "phone_call",
            訪問: "visit",
            媒介: "medium",
            査定書: "report",
        };
        const records = [];
        await new Promise((resolve, reject) => {
            fs_1.default.createReadStream(fileName)
                .pipe((0, csv_parser_1.default)())
                .on("data", (row) => {
                const mappedRecord = {};
                // ★ 追加: remarks（メモ）用の配列を準備
                const remarksList = [];
                for (const [key, value] of Object.entries(row)) {
                    // 値をきれいに整形
                    const cleanValue = value === undefined || value === null ? "" : String(value).trim();
                    // ★ 追加: CSVの日本語ヘッダー（key）と値をそのままremarksにストック
                    remarksList.push(`${key}：${cleanValue}`);
                    // 英語のキー（データベース用）にマッピングして格納
                    mappedRecord[columnMapping[key] || key] = cleanValue;
                }
                // ★ 追加: ストックした文字列を改行で繋いで remarks にセット
                mappedRecord.remarks = remarksList.join('\n');
                records.push(mappedRecord);
            })
                .on("end", async () => {
                console.log(`${records.length}件のデータを取得しました。APIへ送信を開始します。`);
                try {
                    for (const record of records) {
                        record.request = "sumai_step_update";
                        const headers = {
                            Authorization: "4081Kokubu",
                            "Content-Type": "application/json",
                        };
                        const response = await axios_1.default.post("https://khg-marketing.info/dashboard/api/gateway/", record, { headers });
                        console.log(`[${record.id}] 送信完了:`, response.data.status);
                    }
                    resolve();
                }
                catch (error) {
                    console.error("API送信中にエラーが発生しました:", error);
                    reject(error);
                }
            })
                .on("error", (error) => {
                console.error("CSVの読み込み中にエラーが発生しました:", error);
                reject(error);
            });
        });
        console.log("全ての処理が完了しました！");
    }
    catch (error) {
        console.error(`予期せぬエラーが発生しました: ${error}`);
        errors.push(JSON.stringify(error));
    }
    finally {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    }
    (0, sendErrorMail_1.sendErrorMail)(errors, 'runSumaiStep.ts');
};
exports.runSumaiStep = runSumaiStep;

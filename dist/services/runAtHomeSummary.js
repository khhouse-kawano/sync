"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAtHomeSummary = void 0;
const playwright_1 = require("playwright");
const promises_1 = require("fs/promises");
const sync_1 = require("csv-parse/sync");
const axios_1 = __importDefault(require("axios"));
const sendErrorMail_1 = require("./sendErrorMail");
const errors = [];
// テーブル定義順のカラム名配列（index順にマッピングするため）
const athomeColumns = [
    'management_no', 'property_no', 'property_type', 'building_name', 'address',
    'line_station', 'price_man_yen', 'published_date', 'floor_plan_flg', 'photo_count',
    'pv_pc', 'pv_sp', 'pv_mobile', 'pv_total',
    'inquiry_pc', 'inquiry_sp', 'inquiry_mobile', 'inquiry_call', 'inquiry_line', 'inquiry_total',
    'favorite_count', 'movie_play_count', 'secondary_ad_auto'
];
const runAtHomeSummary = async (id, pass) => {
    const browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"], headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const login = async () => {
        try {
            await page.goto('https://atbb.athome.jp/');
            await page.waitForLoadState("networkidle");
            await page.fill('#loginFormText', id);
            await page.fill('#passFormText', pass);
            await page.click('#loginSubmit');
        }
        catch (err) {
            const msg = `ログイン処理に失敗: ${err}`;
            console.log(msg);
            errors.push(msg);
        }
    };
    const waitForMinute = async (targetPage = page) => {
        try {
            await targetPage.waitForLoadState("load");
        }
        catch (e) {
            // loadすらタイムアウトする場合は無視して進む
        }
        await targetPage.waitForTimeout(1000);
    };
    const summarySearch = async () => {
        try {
            await waitForMinute();
            // 1. メニューをクリックして展開する
            const menuTrigger = page.locator('a.header_link', { hasText: 'アクセスログ・反響' });
            await menuTrigger.scrollIntoViewIfNeeded();
            await menuTrigger.click();
            await page.waitForTimeout(1000); // メニューの展開アニメーションを待つ
            // 2. 「一般公開アクセス数」をクリックし、新タブを取得
            const targetDiv = page.locator('div.p-service__u', { hasText: '一般公開アクセス数' });
            const [newPage] = await Promise.all([
                context.waitForEvent('page'),
                targetDiv.click()
            ]);
            console.log('新しいタブの取得に成功しました');
            await waitForMinute(newPage);
            // 💡 日付入力欄のベースXPath
            const basePath = '/html/body/div/div[2]/div[26]/div[2]/form/table[1]/tbody/tr[8]/td/div';
            // 💡 inputValue() で現在の入力値（文字列）を取得する
            const startY = await newPage.locator(`xpath=${basePath}/input[1]`).inputValue();
            const startM = await newPage.locator(`xpath=${basePath}/input[2]`).inputValue();
            const startD = await newPage.locator(`xpath=${basePath}/input[3]`).inputValue();
            const endY = await newPage.locator(`xpath=${basePath}/input[4]`).inputValue();
            const endM = await newPage.locator(`xpath=${basePath}/input[5]`).inputValue();
            const endD = await newPage.locator(`xpath=${basePath}/input[6]`).inputValue();
            // 💡 YYYY-MM-DD 形式に整形（月と日は padStart でゼロ埋め）
            const startDate = `${startY}-${startM.padStart(2, '0')}-${startD.padStart(2, '0')}`;
            const endDate = `${endY}-${endM.padStart(2, '0')}-${endD.padStart(2, '0')}`;
            console.log(`抽出した期間: ${startDate} 〜 ${endDate}`);
            // 💡 pageオブジェクトと一緒に、抽出した日付も返す
            return { newPage, startDate, endDate };
        }
        catch (err) {
            const msg = `お客様ページへの遷移に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
            return null;
        }
    };
    // 💡 引数に startDate と endDate を追加
    const processAndPostData = async (targetPage, startDate, endDate) => {
        try {
            const [download] = await Promise.all([
                targetPage.waitForEvent('download', { timeout: 120000 }),
                targetPage.click('xpath=/html/body/div/div[2]/div[26]/div[2]/form/table[2]/tbody/tr/th/div/button[2]')
            ]);
            const savePath = '/tmp/athome_summary.csv';
            const summaryPath = '/tmp/athome_summary_import_result.json';
            await download.saveAs(savePath);
            console.log('CSVダウンロード完了');
            const buf = await (0, promises_1.readFile)(savePath);
            const text = buf.toString('utf8');
            const records = (0, sync_1.parse)(text, {
                bom: true,
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true
            });
            const targetData = records.slice(1);
            console.log(`パース完了: 合計 ${targetData.length} 件のデータ行`);
            const mappedRecords = targetData.map(row => {
                const record = {};
                athomeColumns.forEach((colName, idx) => {
                    const cellValue = row[idx];
                    record[colName] = (cellValue === undefined || cellValue === null || cellValue === '')
                        ? null
                        : String(cellValue).trim();
                });
                return record;
            });
            const filteredRecords = mappedRecords.filter(record => Object.values(record).some(val => val !== null));
            const POST_URL = 'https://khg-marketing.info/dashboard/api/gateway/';
            async function postChunkWithRetry(url, chunk, retries = 2, delayMs = 1000) {
                const payload = {
                    request: 'athome_db_summary',
                    start_date: startDate, // 💡 ペイロードに追加
                    end_date: endDate, // 💡 ペイロードに追加
                    data: chunk
                };
                let lastErr = null;
                for (let attempt = 0; attempt <= retries; attempt++) {
                    try {
                        const res = await axios_1.default.post(url, payload, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 60000
                        });
                        return res.data ?? {};
                    }
                    catch (err) {
                        lastErr = err;
                        if (attempt < retries)
                            await new Promise(r => setTimeout(r, delayMs));
                    }
                }
                throw lastErr;
            }
            const CHUNK_SIZE = 500;
            const successes = [];
            const failures = [];
            console.log(`API送信開始（${CHUNK_SIZE}件ずつバルク送信）...`);
            for (let i = 0; i < filteredRecords.length; i += CHUNK_SIZE) {
                const chunk = filteredRecords.slice(i, i + CHUNK_SIZE);
                const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
                try {
                    console.log(`チャンク ${chunkNumber} 送信中 (${chunk.length} 件)...`);
                    const res = await postChunkWithRetry(POST_URL, chunk);
                    successes.push({ chunkIndex: chunkNumber, response: res });
                }
                catch (err) {
                    const errMsg = err && err.message ? err.message : String(err);
                    console.error(`チャンク ${chunkNumber} の送信に失敗:`, errMsg);
                    failures.push({ chunkIndex: chunkNumber, error: errMsg });
                }
            }
            console.log(`処理完了！ 成功チャンク: ${successes.length}, 失敗チャンク: ${failures.length}`);
            await (0, promises_1.writeFile)(summaryPath, JSON.stringify({ success: successes, errors: failures }, null, 2), 'utf8');
            console.log('サマリーを保存しました:', summaryPath);
        }
        catch (err) {
            console.error('処理中にエラーが発生しました:', err);
            errors.push(`処理エラー: ${err}`);
        }
    };
    await login();
    // 💡 変数の受け取り方を変更
    const searchResult = await summarySearch();
    if (searchResult) {
        // 💡 取得した startDate と endDate を引数として渡す
        await processAndPostData(searchResult.newPage, searchResult.startDate, searchResult.endDate);
    }
    await browser.close();
    if (errors.length > 0) {
        await (0, sendErrorMail_1.sendErrorMail)(errors, 'runAtHomeSummary.ts');
    }
};
exports.runAtHomeSummary = runAtHomeSummary;

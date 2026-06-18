"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSuumoKhf = void 0;
const playwright_1 = require("playwright");
const errors = [];
const promises_1 = require("fs/promises");
const sync_1 = require("csv-parse/sync");
const axios_1 = __importDefault(require("axios"));
const runSuumoKhf = async (id, pass, brand) => {
    const browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"], headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    const headers = {
        Authorization: "4081Kokubu",
        "Content-Type": "application/json",
    };
    const headerMap = {
        "顧客ID": "customer_id",
        "登録日時": "registered_at",
        "氏名": "name",
        "氏名カナ": "name_kana",
        "メールアドレス": "email",
        "電話": "phone",
        "FAX": "fax",
        "住所": "address",
        "お客様担当": "staff",
        "追客状況": "follow_status",
        "初回反響日": "first_reaction_date",
        "初回反響方法": "first_reaction_method",
        "初回反響媒体": "first_reaction_media",
        "メモ": "memo",
        "初回反響_予約ID": "first_reaction_reserve_id",
        "初回反響_反響ID": "first_reaction_id",
        "初回反響_受付日時": "first_reaction_received_at",
        "初回反響_反響種別": "first_reaction_type",
        "初回反響_物件種別": "first_reaction_property_type",
        "初回反響_物件コード": "first_reaction_property_code",
        "初回反響_物件名": "first_reaction_property_name",
        "初回反響_物件価格": "first_reaction_property_price",
        "初回反響_物件所在地": "first_reaction_property_address",
        "最新反響_予約ID": "latest_reaction_reserve_id",
        "最新反響_反響ID": "latest_reaction_id",
        "最新反響_受付日時": "latest_reaction_received_at",
        "最新反響_反響種別": "latest_reaction_type",
        "最新反響_物件種別": "latest_reaction_property_type",
        "最新反響_物件コード": "latest_reaction_property_code",
        "最新反響_物件名": "latest_reaction_property_name",
        "最新反響_物件価格": "latest_reaction_property_price",
        "最新反響_物件所在地": "latest_reaction_property_address",
        "初回来場_来場日時": "first_visit_datetime",
        "初回来場_入力方法": "first_visit_input_method",
        "初回来場_予定種別": "first_visit_schedule_type",
        "初回来場_物件種別": "first_visit_property_type",
        "初回来場_物件コード": "first_visit_property_code",
        "初回来場_物件名": "first_visit_property_name",
        "初回来場_物件価格": "first_visit_property_price",
        "初回来場_物件所在地": "first_visit_property_address",
        "最新来場_来場日時": "latest_visit_datetime",
        "最新来場_入力方法": "latest_visit_input_method",
        "最新来場_予定種別": "latest_visit_schedule_type",
        "最新来場_物件種別": "latest_visit_property_type",
        "最新来場_物件コード": "latest_visit_property_code",
        "最新来場_物件名": "latest_visit_property_name",
        "最新来場_物件価格": "latest_visit_property_price",
        "最新来場_物件所在地": "latest_visit_property_address",
        "成約_成約日": "contract_date",
        "成約_成約価格": "contract_price",
        "成約_仲介手数料ステータス": "contract_fee_status",
        "成約_仲介手数料（万円）": "contract_fee_amount",
        "成約_付帯工事額・紹介料収入ステータス": "contract_additional_status",
        "成約_付帯工事額・紹介料収入（万円）": "contract_additional_amount",
        "成約_物件種別": "contract_property_type",
        "成約_物件コード": "contract_property_code",
        "成約_物件名": "contract_property_name",
        "成約_物件価格": "contract_property_price",
        "成約_物件所在地": "contract_property_address",
        "成約_ステータス": "contract_status",
        "反響回数": "reaction_count",
        "来場回数": "visit_count",
        "成約フラグ": "contract_flag"
    };
    const numericFields = new Set(['reaction_count', 'visit_count', 'contract_flag']);
    function decodeBuffer(buf) {
        return buf.toString("utf8");
    }
    function mapRecord(jpRecord) {
        const obj = {};
        const record = jpRecord;
        for (const [jpKeyRaw, valRaw] of Object.entries(record)) {
            const jpKey = String(jpKeyRaw).trim().replace(/^"|"$/g, '');
            const mapped = headerMap[jpKey];
            if (!mapped)
                continue;
            const cell = valRaw === undefined || valRaw === null ? "" : String(valRaw).trim();
            if (numericFields.has(mapped)) {
                const normalized = cell.replace(/[,，\s]|万円|円/g, '');
                const n = normalized === "" ? 0 : Number(normalized);
                obj[mapped] = Number.isNaN(n) ? 0 : n;
            }
            else {
                obj[mapped] = cell;
            }
        }
        return obj;
    }
    const login = async () => {
        try {
            await page.goto('https://kr-hometour.suumo.jp/login');
            await page.waitForLoadState("networkidle");
            await page.fill('xpath=/html/body/div/div/div/div/main/div/form/div[1]/div/div/input', id);
            await page.fill('xpath=/html/body/div/div/div/div/main/div/form/div[2]/div/div/input', pass);
            await page.click('xpath=/html/body/div/div/div/div/main/div/form/div[3]/button');
        }
        catch (err) {
            const msg = `ログイン処理に失敗${err}`;
            console.log(msg);
            errors.push(msg);
        }
    };
    const customerSearch = async () => {
        try {
            await page.click('xpath=/html/body/div/div/div/header/nav/ul/li[3]/a');
            await page.waitForLoadState("networkidle");
            // ★ 3秒待つ（描画が追いつくまで）
            await page.waitForTimeout(3000);
            await page.waitForSelector('xpath=/html/body/div/div/div/div/main/div[3]/div[1]/div[1]/div[1]/span/div', { state: 'visible', timeout: 10000 });
            await page.click('xpath=/html/body/div/div/div/div/main/div[2]/div/button/div');
        }
        catch (err) {
            const msg = `お客様ページへの遷移に失敗${err}`;
            console.log(msg);
            errors.push(msg);
        }
    };
    const customerSave = async () => {
        try {
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 120000 }),
                page.click('xpath=/html/body/div[2]/div[2]/div[2]/div/div/div[2]/button[2]')
            ]);
            const savePath = '/tmp/customer.csv';
            const summaryPath = '/tmp/import_result_summary.json';
            await download.saveAs(savePath);
            const POST_URL = 'https://khg-marketing.info/dashboard/api/gateway/';
            const RETRY_COUNT = 2;
            const RETRY_DELAY_MS = 1000;
            const CHUNK_SIZE = 500; // 500件ずつに分割して送信
            const buf = await (0, promises_1.readFile)(savePath);
            const text = decodeBuffer(buf);
            const jpRecords = (0, sync_1.parse)(text, {
                bom: true,
                columns: true,
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true
            });
            console.log('parsed rows:', jpRecords.length);
            // 1. カラム名をマッピングして正規化
            const mapped = jpRecords.map(mapRecord);
            // 2. バルク配信用に関数を修正（requestパラメータとデータ配列を分ける）
            async function postChunkWithRetry(url, chunk, retries = 2, delayMs = 1000) {
                // ここで request パラメータを指定し、実際のレコードは data に配列として入れる
                const payload = {
                    request: brand === 'kaeru' ? 'suumo_db_kaeru' : 'suumo_db_resale',
                    data: chunk
                };
                let lastErr = null;
                for (let attempt = 0; attempt <= retries; attempt++) {
                    try {
                        const res = await axios_1.default.post(url, payload, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 60000 // 一度に多く送るためタイムアウトを長めに設定
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
            const successes = [];
            const failures = [];
            // 3. データを500件ずつのチャンク（塊）に分割して順次送信
            console.log(`Starting bulk upload in chunks of ${CHUNK_SIZE}...`);
            for (let i = 0; i < mapped.length; i += CHUNK_SIZE) {
                const chunk = mapped.slice(i, i + CHUNK_SIZE);
                const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
                try {
                    console.log(`Posting chunk ${chunkNumber} (${chunk.length} records)...`);
                    const res = await postChunkWithRetry(POST_URL, chunk, RETRY_COUNT, RETRY_DELAY_MS);
                    successes.push({ chunkIndex: chunkNumber, response: res });
                }
                catch (err) {
                    const errMsg = err && err.message ? err.message : String(err);
                    console.error(`Failed chunk ${chunkNumber}:`, errMsg);
                    failures.push({ chunkIndex: chunkNumber, error: errMsg, sampleRecord: chunk[0] });
                }
            }
            console.log('done. success chunks:', successes.length, 'failed chunks:', failures.length);
            await (0, promises_1.writeFile)(summaryPath, JSON.stringify({ success: successes, errors: failures }, null, 2), 'utf8');
            console.log('summary saved to', summaryPath);
        }
        catch (err) {
            const msg = `ダウンロード/インポート処理に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
    };
    await login();
    await customerSearch();
    await customerSave();
    await browser.close();
};
exports.runSuumoKhf = runSuumoKhf;

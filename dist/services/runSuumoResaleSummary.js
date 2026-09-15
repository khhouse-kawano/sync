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
exports.runSuumoResaleSummary = void 0;
const playwright_1 = require("playwright");
const promises_1 = require("fs/promises");
const xlsx = __importStar(require("xlsx")); // xlsxパッケージに変更
const axios_1 = __importDefault(require("axios"));
const portalPage_1 = require("../utils/portalPage");
const sendErrorMail_1 = require("./sendErrorMail");
// 先ほど作成したテーブル(suumo_resale_summary)のカラム順（システムIDなどを除く）
// Excelの2列目（インデックス1）から順番にマッピングするための配列
const summaryColumns = [
    'basic_info', // 2列目: 種別 物件名...
    'location_and_price', // 3列目: 沿線名 駅名...
    'registered_images', // 4列目: 登録画像...
    'contract_status', // 5列目: 成約状況
    'suumo_net_status', // 6列目: SUUMOネット コマ掲載...
    'suumo_net_options', // 7列目: SUUMOネット オプション...
    'hp_service', // 8列目: HPサービス掲載...
    'suumo_magazine_past', // 9列目: SUUMOマガジン 過去掲載
    'suumo_magazine_current', // 10列目: SUUMOマガジン 今回掲載...
    'timestamps_info', // 11列目: 物件登録日時...
    'summary', // 12列目: 概要
    'catch_and_layout', // 13列目: ネット用メインキャッチ...
    'trade_company_info', // 14列目: 取引態様...
    'internal_info', // 15列目: ★マーク...
    'company_code', // 16列目: 会社コード
    'property_type_detail', // 17列目: 物件種別
    'station_detail', // 18列目: 沿線駅
    'address', // 19列目: 住所
    'min_price', // 20列目: 最低価格
    'max_price', // 21列目: 最高価格
    'original_company', // 22列目: 元付け会社名
    'original_staff', // 23列目: 元付け担当
    'bulk_upload_code', // 24列目: 一括入稿物件コード
    'management_no', // 25列目: 貴社物件管理NO
    'staff_in_charge', // 26列目: 貴社御担当
    'property_category', // 27列目: 物件区分
    'publication_plan', // 28列目: 掲載企画
    'pv_total', // 29列目: 詳細PV数（全期間）
    'pv_recent_week', // 30列目: 詳細PV数（直近１週間）
    'total_images', // 31列目: 総画像数
    'highlight_detail' // 32列目: ハイライト
];
/**
 * @param brand 呼び出し元（portalService）が渡すアカウント識別子。
 *   ⚠️ サマリーの保存先を分けるために使う。suumo_summary と suumo_summary_2 は
 *     同じ関数を2アカウントで実行するため、これが無いと
 *     **2つ目が1つ目のサマリーを上書きする**（2026-09-09 のログで確認）。
 */
const runSuumoResaleSummary = async (id, pass, brand) => {
    // 実行ごとに初期化する。モジュールスコープだと前回のエラーが次回に持ち越される。
    const errors = [];
    const browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"], headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const login = async () => {
        try {
            await page.goto('https://manager.suumo.jp/chukai/login/');
            await page.waitForLoadState("networkidle");
            await page.fill('#tags', id);
            await page.fill('#pass', pass);
            await page.click('xpath=/html/body/div/div/div[1]/div[1]/div[1]/div/form/dl/dd[6]/a');
        }
        catch (err) {
            const msg = `ログイン処理に失敗${err}`;
            console.log(msg);
            errors.push(msg);
        }
    };
    const waitForMinute = async () => {
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
    };
    const summarySearch = async () => {
        try {
            await page.click('xpath=/html/body/div[1]/div[2]/div[1]/ul/li[5]/a'); //その他ボタンクリック
            await waitForMinute();
        }
        catch (err) {
            const msg = `その他のページへの遷移に失敗${err}`;
            console.log(msg);
            errors.push(msg);
        }
    };
    const processAndPostData = async () => {
        try {
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 120000 }),
                page.click('#btnMenteKonsyu') // ※対象のダウンロードボタンのセレクタに適宜変更してください
            ]);
            // Excelファイルとして保存
            const savePath = '/tmp/resale_summary.xlsx';
            // ⚠️ アカウントごとに分ける（引数 brand のコメント参照）
            const summaryPath = `/tmp/resale_summary_import_${brand ?? 'default'}.json`;
            await download.saveAs(savePath);
            console.log('Excelダウンロード完了');
            const buf = await (0, promises_1.readFile)(savePath);
            // xlsxパッケージでバッファからワークブックを読み込む
            const workbook = xlsx.read(buf, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0]; // 最初のシートを取得
            const worksheet = workbook.Sheets[sheetName];
            // データを二次元配列として取得 (header: 1 オプション)
            const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            // 5行目から実際のデータ (インデックス 4)
            const targetData = rawData.slice(4);
            console.log(`パース完了: 抽出データ ${targetData.length} 件`);
            // データのマッピング (1列目のNoは無視してインデックス1から取得)
            const mappedRecords = targetData.map((row) => {
                const record = {};
                // summaryColumnsの順序に従って列(1〜31)をマッピング
                summaryColumns.forEach((colName, idx) => {
                    // row[idx + 1] で2列目(インデックス1)からアクセス
                    const cellValue = row[idx + 1];
                    record[colName] = (cellValue === undefined || cellValue === null || cellValue === '')
                        ? null
                        : String(cellValue).trim();
                });
                return record;
            });
            // 空の行（データがすべてnull）を除外する安全策
            const filteredRecords = mappedRecords.filter(record => Object.values(record).some(val => val !== null));
            const POST_URL = 'https://khg-marketing.info/dashboard/api/gateway/';
            async function postChunkWithRetry(url, chunk, retries = 2, delayMs = 1000) {
                const payload = {
                    request: 'suumo_db_resale_summary', // バックエンド側の要求に合わせて変更
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
    try {
        await login();
        await summarySearch();
        await processAndPostData();
    }
    catch (err) {
        const msg = `処理全体が中断しました: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
    finally {
        // 例外が起きても Chromium を必ず終了させる。
        // 閉じ残るとメモリを圧迫し、後続タスクや次回以降の実行まで巻き込んで失敗する。
        await (0, portalPage_1.closeBrowser)(browser);
        if (errors.length > 0) {
            await (0, sendErrorMail_1.sendErrorMail)(errors, 'runSuumoResaleSummary.ts');
        }
    }
};
exports.runSuumoResaleSummary = runSuumoResaleSummary;

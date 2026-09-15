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
exports.runHomesSummary = void 0;
const playwright_1 = require("playwright");
const promises_1 = require("fs/promises");
const sync_1 = require("csv-parse/sync");
const axios_1 = __importDefault(require("axios"));
const portalPage_1 = require("../utils/portalPage");
const sendErrorMail_1 = require("./sendErrorMail");
const iconv = __importStar(require("iconv-lite")); // 💡 追加: Shift-JIS変換用の堅牢なライブラリ
// テーブル定義順のカラム名配列
const homesColumns = [
    'property_id', 'company_management_number', 'property_name', 'room_section', 'address',
    'railway_line', 'station', 'walk_minutes', 'bus_minutes', 'price_rent',
    'common_service_fee', 'layout', 'exclusive_area', 'property_type', 'construction_year',
    'created_date', 'updated_date', 'status', 'floor_plan_image', 'exterior_image',
    'lifull_homes_published', 'special_ad_impressions', 'special_ad_clicks', 'detail_page_views', 'inquiries_count', 'inquiry_rate'
];
const runHomesSummary = async (id, pass, brand) => {
    // 実行ごとに初期化する。モジュールスコープだと前回のエラーが次回に持ち越される。
    const errors = [];
    /**
     * この実行を失敗として扱うか。
     *
     * ─────────────────────────────────────────────
     * ⚠️⚠️ **例外を投げないと portalService は成功として扱う。**
     *   portalService.ts は `await executeTask(...)` が例外を投げなければ
     *   `ok: true, message: '... の更新が完了しました'` を積む
     *   （portalService.ts:167 付近）。
     *
     *   2026-09-11 まで、この関数は errors に積んでメールを送るだけで
     *   例外を投げていなかった。そのため
     *
     *     お客様ページへの遷移に失敗: TimeoutError: ...
     *     { name: 'homes_summary', ok: true, message: '... 完了しました' }
     *
     *   という状態になり、**spec のデータが1件も取れていないのに
     *   成功と報告されていた**。failedTasks も空だった。
     *
     * ⚠️ 成功したときの挙動は変えていない。失敗が失敗として見えるようにしただけ。
     * ─────────────────────────────────────────────
     */
    let fatal = false;
    const target = {
        spec: {
            name: 'かえるホーム',
            path: 'xpath=/html/body/div[5]/div/div[9]/div/div/div/div[2]/form/div[2]/table/tbody/tr[3]/td/a'
        },
        used: {
            name: '中古住宅専門店',
            path: 'xpath=/html/body/div[5]/div/div[9]/div/div/div/div[2]/form/div[2]/table/tbody/tr[2]/td/a'
        }
    };
    /**
     * ⚠️⚠️ **黙って return しない。**
     *   ここで return すると例外が出ず、portalService が成功として扱う。
     *   brand の指定漏れは設定の誤りなので、はっきり失敗させる。
     *   ⚠️ portal 定義（portalService.ts）で homes_summary に
     *     brand: 'spec' / 'used' を必ず付けること。
     */
    if (!brand || !(brand in target)) {
        throw new Error(`runHomesSummary: brand が不正です（受け取った値: ${brand ?? 'undefined'}）。` +
            `portalService.ts の portal 定義で 'spec' か 'used' を指定してください。`);
    }
    const brandTarget = target[brand];
    const browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"], headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    /** ログインフォームのID欄。⚠️ ログイン成功の判定にも使う */
    const LOGIN_ID_PATH = 'xpath=/html/body/div/div/div[2]/form/div[1]/div/div/dl[1]/dd[1]/input';
    const login = async () => {
        try {
            await page.goto('https://lifull.my.site.com/pro/UserLogin');
            await page.waitForLoadState("networkidle");
            await page.fill(LOGIN_ID_PATH, id);
            await page.fill('xpath=/html/body/div/div/div[2]/form/div[1]/div/div/dl[2]/dd[1]/input', pass);
            await page.click('xpath=/html/body/div/div/div[2]/form/div[1]/div/div/ul/li[2]/input');
            await waitForMinute();
            /**
             * ⚠️⚠️ **ログインできたか必ず確かめる。**
             *   2026-09-11 まで確認していなかったため、ログインに失敗しても
             *   そのまま summarySearch へ進み、ログイン画面でメニューを探して
             *   「tr[3] が見えない」という**無関係なエラー**になっていた。
             *   真の原因が隠れるので、ここで止める。
             *
             * ⚠️ 判定はログインフォームが残っているかで行う。
             *   成功すると画面が遷移してこの要素は消える。
             */
            const stillOnLoginForm = await page.locator(LOGIN_ID_PATH)
                .isVisible()
                .catch(() => false);
            if (stillOnLoginForm) {
                await (0, portalPage_1.logPageState)(page, `homes-summary-${brand}-ログイン失敗`);
                throw new Error('ログイン後もログインフォームが残っています（ID・パスワードか、フォームのxpathを確認してください）');
            }
        }
        catch (err) {
            const msg = `ログイン処理に失敗: ${err}`;
            console.log(msg);
            errors.push(msg);
            fatal = true;
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
    // JSで直接クリックを強制発火させるヘルパー関数
    const jsClick = async (path, targetPage) => {
        if (!path)
            return;
        const locator = targetPage.locator(path);
        try {
            await locator.waitFor({ state: 'attached', timeout: 5000 });
            await locator.evaluate((node) => node.click());
            await waitForMinute();
        }
        catch (err) {
            console.log(`要素が見つからないかクリックできませんでした: ${path}`);
        }
    };
    const summarySearch = async () => {
        try {
            await waitForMinute();
            if (brand === 'spec') {
                const menuPath = 'xpath=/html/body/div[1]/div[2]/div[1]/div[1]/div/div[1]/h3/a/span';
                const menuLocator = page.locator(menuPath);
                /**
                 * ⚠️⚠️ **クリックの失敗を握りつぶさない。**
                 *   2026-09-11 まで `.catch(() => { })` で捨てていた。
                 *   メニューが無い（＝ログインできていない、xpathがずれた）場合でも
                 *   そのまま進み、15秒後に「tr[3] が見えない」で落ちるため、
                 *   **原因がモーダル側にあるように見えていた**。
                 *
                 * ⚠️⚠️ **`visible` ではなく `attached` で待つこと。**
                 *   クリックは `evaluate(node.click())` で直接発火させており、
                 *   これは**非表示の要素でも動く**。`visible` を求めると、
                 *   今まで動いていたケースを新たに失敗させてしまう。
                 *   ⚠️ 同ファイルの jsClick も attached を使っている。揃えること。
                 */
                await menuLocator.waitFor({ state: 'attached', timeout: 15000 });
                await menuLocator.evaluate((node) => node.click());
                console.log(`${brandTarget.name} のモーダル/メニュー表示を待機します...`);
                const brandLocator = page.locator(brandTarget.path);
                await brandLocator.waitFor({ state: 'visible', timeout: 15000 });
                console.log(`${brandTarget.name} のリンクを確認しました。クリックして新しいタブを待ちます...`);
                const [newPage] = await Promise.all([
                    context.waitForEvent('page', { timeout: 60000 }),
                    brandLocator.evaluate((node) => node.click())
                ]);
                await waitForMinute(newPage);
                return newPage;
            }
            else {
                const brandLocator = page.locator('xpath=/html/body/div[1]/div[2]/div[1]/div[1]/div/div[1]/h3/a/span');
                const [newPage] = await Promise.all([
                    context.waitForEvent('page', { timeout: 60000 }),
                    brandLocator.evaluate((node) => node.click())
                ]);
                await waitForMinute(newPage);
                return newPage;
            }
        }
        catch (err) {
            const msg = `お客様ページへの遷移に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
            fatal = true;
            /**
             * ⚠️⚠️ **失敗したページの現物を残す。**
             *   この関数は 2026-09-11 まで何も保存しておらず、
             *   「tr[3] が見えない」という文言しか手がかりが無かった。
             *   at-home 側（runAtHomeSummary / athomeModal）は
             *   HTML とスクリーンショットを残しており、それで原因
             *   （約款モーダルのボタンが disabled）を特定できた。
             *   同じことが spec でもできるようにする。
             *
             * ⚠️ 保存の失敗で本処理を止めないこと。診断のための付加機能である。
             */
            await (0, portalPage_1.logPageState)(page, `homes-summary-${brand}-遷移失敗`).catch(() => { });
            return null;
        }
    };
    const processAndPostData = async (targetPage) => {
        try {
            await jsClick('xpath=/html/body/div[1]/div[2]/div/ul/li[5]/a', targetPage);
            await jsClick('xpath=/html/body/div[1]/div[3]/div[3]/form/div/div[2]/div/div/ul/li[1]/a', targetPage);
            await waitForMinute();
            console.log('CSVダウンロードを開始します...');
            const downloadBtnPath = 'xpath=/html/body/div[1]/div[3]/div[3]/form/div/div[1]/table/tbody/tr[4]/td/div/span/a';
            const downloadBtn = targetPage.locator(downloadBtnPath);
            const [download] = await Promise.all([
                targetPage.waitForEvent('download', { timeout: 120000 }),
                downloadBtn.evaluate((node) => node.click())
            ]);
            const savePath = '/tmp/homes_summary.csv';
            // ⚠️ アカウントごとに分ける。homes_summary（spec）と
            //   homes_summary_2（used）は同じ関数なので、固定名だと
            //   **2つ目が1つ目のサマリーを上書きする**（2026-09-09 に確認）
            const summaryPath = `/tmp/homes_summary_import_result_${brand ?? 'default'}.json`;
            await download.saveAs(savePath);
            console.log('CSVダウンロード完了');
            const buf = await (0, promises_1.readFile)(savePath);
            // 💡 修正ポイント：iconv-liteによる正確なデコードと制御文字の除去
            let text = iconv.decode(buf, 'Shift_JIS');
            // PHPのjson_decodeを密かにクラッシュさせる見えない制御文字を完全除去
            text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
            const records = (0, sync_1.parse)(text, {
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true
            });
            // 1行目はヘッダーなのでスキップし3行目から処理
            const targetData = records.slice(2);
            console.log(`パース完了: 合計 ${targetData.length} 件のデータ行`);
            const mappedRecords = targetData.map(row => {
                const record = {};
                homesColumns.forEach((colName, idx) => {
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
                    request: 'homes_summary_db',
                    data: chunk
                };
                let lastErr = null;
                for (let attempt = 0; attempt <= retries; attempt++) {
                    try {
                        const res = await axios_1.default.post(url, payload, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 60000
                        });
                        // 💡 追加：HTTP200でも、PHP側のビジネスロジックで失敗していたらエラーを投げる
                        const responseData = res.data ?? {};
                        if (responseData.status !== 'success' || responseData.message === 'データがありません') {
                            console.error("🚨 サーバーからの詳細な返答:", responseData); // 👈 これを追加
                            throw new Error(`API側エラー: ${responseData.message}`);
                        }
                        return responseData;
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
            fatal = true;
            // ⚠️ CSVの取得や送信で落ちたときも現物を残す
            await (0, portalPage_1.logPageState)(targetPage, `homes-summary-${brand}-処理失敗`).catch(() => { });
        }
    };
    try {
        await login();
        // ⚠️ ログインに失敗したら先へ進まない。
        //   進むとログイン画面でメニューを探し、無関係なエラーになる。
        if (!fatal) {
            const activePage = await summarySearch();
            if (activePage) {
                await processAndPostData(activePage);
            }
        }
    }
    catch (err) {
        const msg = `処理全体が中断しました: ${err}`;
        console.error(msg);
        errors.push(msg);
        fatal = true;
    }
    finally {
        // 例外が起きても Chromium を必ず終了させる。
        // 閉じ残るとメモリを圧迫し、後続タスクや次回以降の実行まで巻き込んで失敗する。
        await (0, portalPage_1.closeBrowser)(browser);
        if (errors.length > 0) {
            await (0, sendErrorMail_1.sendErrorMail)(errors, 'runHomesSummary.ts');
        }
    }
    /**
     * ⚠️⚠️ **finally の「後」で投げること。**
     *   finally の中で投げると closeBrowser や sendErrorMail が
     *   最後まで走らないおそれがある。ブラウザの閉じ残りは
     *   後続タスクまで巻き込むため、片付けを終えてから投げる。
     *
     * ⚠️ ここで投げて初めて portalService が ok: false にする。
     *   投げないと「データ0件なのに成功」に戻る。
     */
    if (fatal) {
        throw new Error(errors.join(' / '));
    }
};
exports.runHomesSummary = runHomesSummary;

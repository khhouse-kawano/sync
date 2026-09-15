import { chromium } from 'playwright';
import { readFile, writeFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import axios from 'axios';
import { closeBrowser } from '../utils/portalPage';
import { dismissAthomeModal } from '../utils/athomeModal';
import { sendErrorMail } from './sendErrorMail';


// テーブル定義順のカラム名配列（index順にマッピングするため）
const athomeColumns = [
    'management_no', 'property_no', 'property_type', 'building_name', 'address',
    'line_station', 'price_man_yen', 'published_date', 'floor_plan_flg', 'photo_count',
    'pv_pc', 'pv_sp', 'pv_mobile', 'pv_total',
    'inquiry_pc', 'inquiry_sp', 'inquiry_mobile', 'inquiry_call', 'inquiry_line', 'inquiry_total',
    'favorite_count', 'movie_play_count', 'secondary_ad_auto'
];

/**
 * @param brand 呼び出し元（portalService）が渡すアカウント識別子。
 *   ⚠️ サマリーの保存先を分けるために使う。athome_summary と athome_summary_2 は
 *     同じ関数を2アカウントで実行するため、これが無いと
 *     2つ目が1つ目のサマリーを上書きする。
 */
export const runAtHomeSummary = async (id: string, pass: string, brand?: string) => {
    // 実行ごとに初期化する。モジュールスコープだと前回のエラーが次回に持ち越される。
    const errors: string[] = [];
    /**
     * ⚠️⚠️ **致命的なエラーがあったか。** 最後に throw して呼び出し側へ伝える。
     *
     *   2026-09-09 まで、エラーは errors に積んでメールを送るだけで
     *   **例外を投げずに正常終了していた**。そのため portalService の
     *   try/catch に届かず、応答は
     *     { name: 'athome_summary', ok: true, message: '...更新が完了しました' }
     *   となり、**失敗が応答から消えていた**（実際に約款モーダルで
     *   2アカウントとも失敗したのに ok: true が返っていた）。
     *
     * ⚠️ 「0件だった」のような軽微なものは errors に積むだけにして、
     *   ここは立てないこと。全部を致命的にすると、警告のたびに
     *   タスク全体が失敗扱いになる。
     */
    let fatal = false;
    const browser = await chromium.launch({ args: ["--no-sandbox"], headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const login = async () => {
        try {
            await page.goto('https://atbb.athome.jp/');
            await page.waitForLoadState("networkidle");
            await page.fill('#loginFormText', id);
            await page.fill('#passFormText', pass);
            await page.click('#loginSubmit');
        } catch (err) {
            const msg = `ログイン処理に失敗: ${err}`;
            console.log(msg);
            errors.push(msg);
            // ⚠️ ログインできなければ以降は何もできない。致命的として扱う
            fatal = true;
        }
    };

    const waitForMinute = async (targetPage = page) => {
        try {
            await targetPage.waitForLoadState("load");
        } catch (e) {
            // loadすらタイムアウトする場合は無視して進む
        }
        await targetPage.waitForTimeout(1000);
    }

    const summarySearch = async () => {
        try {
            await waitForMinute();

            /**
             * ⚠️⚠️ **メニューをクリックする前に約款モーダルを閉じる。**
             *
             *   at home は約款が更新された日に同意モーダル（#colorbox）を
             *   最前面に出す。要素は見つかるのにクリックだけが奪われるため、
             *   「セレクタが違う」ように見えて実際は違う。
             *   2026-09-09 に athome_summary / athome_summary_2 の
             *   2アカウントとも30秒 timeout で失敗した。
             *
             * ⚠️ 詳細と force:true を使わない理由は utils/athomeModal.ts を参照。
             */
            await dismissAthomeModal(page);

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

        } catch (err) {
            const msg = `お客様ページへの遷移に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
            // ⚠️ 一覧ページに行けなければデータが1件も取れない。致命的として扱う
            fatal = true;
            return null;
        }
    };

    // 💡 引数に startDate と endDate を追加
    const processAndPostData = async (targetPage: any, startDate: string, endDate: string) => {
        try {
            const [download] = await Promise.all([
                targetPage.waitForEvent('download', { timeout: 120000 }),
                targetPage.click('xpath=/html/body/div/div[2]/div[26]/div[2]/form/table[2]/tbody/tr/th/div/button[2]')
            ]);

            const savePath = '/tmp/athome_summary.csv';
            // ⚠️ アカウントごとに分ける（引数 brand のコメント参照）
            const summaryPath = `/tmp/athome_summary_import_result_${brand ?? 'default'}.json`;
            await download.saveAs(savePath);
            console.log('CSVダウンロード完了');

            const buf: Buffer = await readFile(savePath);
            const text: string = buf.toString('utf8');

            const records = parse(text, {
                bom: true,
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true
            }) as string[][];

            const targetData = records.slice(1);
            console.log(`パース完了: 合計 ${targetData.length} 件のデータ行`);

            const mappedRecords = targetData.map(row => {
                const record: Record<string, string | null> = {};
                athomeColumns.forEach((colName, idx) => {
                    const cellValue = row[idx];
                    record[colName] = (cellValue === undefined || cellValue === null || cellValue === '')
                        ? null
                        : String(cellValue).trim();
                });
                return record;
            });

            const filteredRecords = mappedRecords.filter(record =>
                Object.values(record).some(val => val !== null)
            );

            const POST_URL = 'https://khg-marketing.info/dashboard/api/gateway/';
            
            async function postChunkWithRetry(url: string, chunk: any[], retries = 2, delayMs = 1000) {
                const payload = {
                    request: 'athome_db_summary',
                    start_date: startDate, // 💡 ペイロードに追加
                    end_date: endDate,     // 💡 ペイロードに追加
                    data: chunk
                };

                let lastErr: any = null;
                for (let attempt = 0; attempt <= retries; attempt++) {
                    try {
                        const res = await axios.post(url, payload, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 60000
                        });
                        return res.data ?? {};
                    } catch (err) {
                        lastErr = err;
                        if (attempt < retries) await new Promise(r => setTimeout(r, delayMs));
                    }
                }
                throw lastErr;
            }

            const CHUNK_SIZE = 500;
            const successes: any[] = [];
            const failures: any[] = [];

            console.log(`API送信開始（${CHUNK_SIZE}件ずつバルク送信）...`);

            for (let i = 0; i < filteredRecords.length; i += CHUNK_SIZE) {
                const chunk = filteredRecords.slice(i, i + CHUNK_SIZE);
                const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;

                try {
                    console.log(`チャンク ${chunkNumber} 送信中 (${chunk.length} 件)...`);
                    const res = await postChunkWithRetry(POST_URL, chunk);
                    successes.push({ chunkIndex: chunkNumber, response: res });
                } catch (err) {
                    const errMsg = err && (err as any).message ? (err as any).message : String(err);
                    console.error(`チャンク ${chunkNumber} の送信に失敗:`, errMsg);
                    failures.push({ chunkIndex: chunkNumber, error: errMsg });
                }
            }

            console.log(`処理完了！ 成功チャンク: ${successes.length}, 失敗チャンク: ${failures.length}`);

            await writeFile(summaryPath, JSON.stringify({ success: successes, errors: failures }, null, 2), 'utf8');
            console.log('サマリーを保存しました:', summaryPath);

        } catch (err) {
            console.error('処理中にエラーが発生しました:', err);
            errors.push(`処理エラー: ${err}`);
        }
    };

    try {
        await login();

        // 💡 変数の受け取り方を変更
        const searchResult = await summarySearch();

        if (searchResult) {
            // 💡 取得した startDate と endDate を引数として渡す
            await processAndPostData(searchResult.newPage, searchResult.startDate, searchResult.endDate);
        }
    } catch (err) {
        const msg = `処理全体が中断しました: ${err}`;
        console.error(msg);
        errors.push(msg);
        fatal = true;
    } finally {
        // 例外が起きても Chromium を必ず終了させる。
        // 閉じ残るとメモリを圧迫し、後続タスクや次回以降の実行まで巻き込んで失敗する。
        await closeBrowser(browser);
        if (errors.length > 0) {
            await sendErrorMail(errors, 'runAtHomeSummary.ts');
        }
    }

    /**
     * ⚠️⚠️ **致命的なエラーは呼び出し側へ投げる。**
     *   finally の**後**に置くこと。finally の中で throw すると、
     *   closeBrowser が終わる前に抜けて Chromium が残る。
     *   （残るとメモリを圧迫し、後続タスクまで巻き込んで失敗する）
     */
    if (fatal) {
        throw new Error(errors.join(' / '));
    }
};
import { chromium } from 'playwright';
import { readFile, writeFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import axios from 'axios';
import { closeBrowser } from '../utils/portalPage';
import { sendErrorMail } from './sendErrorMail';
import * as iconv from 'iconv-lite'; // 💡 追加: Shift-JIS変換用の堅牢なライブラリ


// テーブル定義順のカラム名配列
const homesColumns = [
    'property_id', 'company_management_number', 'property_name', 'room_section', 'address',
    'railway_line', 'station', 'walk_minutes', 'bus_minutes', 'price_rent',
    'common_service_fee', 'layout', 'exclusive_area', 'property_type', 'construction_year',
    'created_date', 'updated_date', 'status', 'floor_plan_image', 'exterior_image',
    'lifull_homes_published', 'special_ad_impressions', 'special_ad_clicks', 'detail_page_views', 'inquiries_count', 'inquiry_rate'
];

export const runHomesSummary = async (id: string, pass: string, brand?: string) => {
    // 実行ごとに初期化する。モジュールスコープだと前回のエラーが次回に持ち越される。
    const errors: string[] = [];
    const target: Record<string, { name: string; path: string }> = {
        spec: {
            name: 'かえるホーム',
            path: 'xpath=/html/body/div[5]/div/div[9]/div/div/div/div[2]/form/div[2]/table/tbody/tr[3]/td/a'
        },
        used: {
            name: '中古住宅専門店',
            path: 'xpath=/html/body/div[5]/div/div[9]/div/div/div/div[2]/form/div[2]/table/tbody/tr[2]/td/a'
        }
    } as const;

    if (!brand || !(brand in target)) return;

    const brandTarget = target[brand as keyof typeof target];
    const browser = await chromium.launch({ args: ["--no-sandbox"], headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const login = async () => {
        try {
            await page.goto('https://lifull.my.site.com/pro/UserLogin');
            await page.waitForLoadState("networkidle");
            await page.fill('xpath=/html/body/div/div/div[2]/form/div[1]/div/div/dl[1]/dd[1]/input', id);
            await page.fill('xpath=/html/body/div/div/div[2]/form/div[1]/div/div/dl[2]/dd[1]/input', pass);
            await page.click('xpath=/html/body/div/div/div[2]/form/div[1]/div/div/ul/li[2]/input');
        } catch (err) {
            const msg = `ログイン処理に失敗: ${err}`;
            console.log(msg);
            errors.push(msg);
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

    // JSで直接クリックを強制発火させるヘルパー関数
    const jsClick = async (path: string, targetPage: any) => {
        if (!path) return;
        const locator = targetPage.locator(path);
        try {
            await locator.waitFor({ state: 'attached', timeout: 5000 });
            await locator.evaluate((node: HTMLElement) => node.click());
            await waitForMinute();
        } catch (err) {
            console.log(`要素が見つからないかクリックできませんでした: ${path}`);
        }
    }

    const summarySearch = async () => {
        try {
            await waitForMinute();

            if (brand === 'spec') {
                const menuPath = 'xpath=/html/body/div[1]/div[2]/div[1]/div[1]/div/div[1]/h3/a/span';
                const menuLocator = page.locator(menuPath);
                await menuLocator.evaluate((node: HTMLElement) => node.click()).catch(() => { });

                console.log(`${brandTarget.name} のモーダル/メニュー表示を待機します...`);

                const brandLocator = page.locator(brandTarget.path);
                await brandLocator.waitFor({ state: 'visible', timeout: 15000 });
                console.log(`${brandTarget.name} のリンクを確認しました。クリックして新しいタブを待ちます...`);

                const [newPage] = await Promise.all([
                    context.waitForEvent('page', { timeout: 60000 }),
                    brandLocator.evaluate((node: HTMLElement) => node.click())
                ]);

                await waitForMinute(newPage);
                return newPage;
            } else {
                const brandLocator = page.locator('xpath=/html/body/div[1]/div[2]/div[1]/div[1]/div/div[1]/h3/a/span');

                const [newPage] = await Promise.all([
                    context.waitForEvent('page', { timeout: 60000 }),
                    brandLocator.evaluate((node: HTMLElement) => node.click())
                ]);

                await waitForMinute(newPage);
                return newPage;
            }

        } catch (err) {
            const msg = `お客様ページへの遷移に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
            return null;
        }
    };

    const processAndPostData = async (targetPage: any) => {
        try {
            await jsClick('xpath=/html/body/div[1]/div[2]/div/ul/li[5]/a', targetPage);
            await jsClick('xpath=/html/body/div[1]/div[3]/div[3]/form/div/div[2]/div/div/ul/li[1]/a', targetPage);

            await waitForMinute();

            console.log('CSVダウンロードを開始します...');
            const downloadBtnPath = 'xpath=/html/body/div[1]/div[3]/div[3]/form/div/div[1]/table/tbody/tr[4]/td/div/span/a';
            const downloadBtn = targetPage.locator(downloadBtnPath);

            const [download] = await Promise.all([
                targetPage.waitForEvent('download', { timeout: 120000 }),
                downloadBtn.evaluate((node: HTMLElement) => node.click())
            ]);

            const savePath = '/tmp/homes_summary.csv';
            const summaryPath = '/tmp/homes_summary_import_result.json';
            await download.saveAs(savePath);
            console.log('CSVダウンロード完了');

            const buf: Buffer = await readFile(savePath);

            // 💡 修正ポイント：iconv-liteによる正確なデコードと制御文字の除去
            let text: string = iconv.decode(buf, 'Shift_JIS');
            // PHPのjson_decodeを密かにクラッシュさせる見えない制御文字を完全除去
            text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

            const records = parse(text, {
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true
            }) as string[][];

            // 1行目はヘッダーなのでスキップし3行目から処理
            const targetData = records.slice(2);
            console.log(`パース完了: 合計 ${targetData.length} 件のデータ行`);

            const mappedRecords = targetData.map(row => {
                const record: Record<string, string | null> = {};
                homesColumns.forEach((colName, idx) => {
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
        request: 'homes_summary_db',
        data: chunk
    };

    let lastErr: any = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await axios.post(url, payload, {
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

        const activePage = await summarySearch();

        if (activePage) {
            await processAndPostData(activePage);
        }
    } catch (err) {
        const msg = `処理全体が中断しました: ${err}`;
        console.error(msg);
        errors.push(msg);
    } finally {
        // 例外が起きても Chromium を必ず終了させる。
        // 閉じ残るとメモリを圧迫し、後続タスクや次回以降の実行まで巻き込んで失敗する。
        await closeBrowser(browser);
        if (errors.length > 0) {
            await sendErrorMail(errors, 'runHomesSummary.ts');
        }
    }
};
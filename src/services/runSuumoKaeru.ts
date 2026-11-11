import { chromium } from 'playwright';
import { closeBrowser } from "../utils/portalPage";
import { sendErrorMail } from "./sendErrorMail";
import { importSuumoKaeruActions, importSuumoKaeruCustomers } from "../utils/suumoKaeruCsv";

export const runSuumoKaeru = async (suumo_kaeru_id: string, suumo_kaeru_pass: string) => {
    // 実行ごとに初期化する。モジュールスコープだと前回のエラーが次回に持ち越される。
    const errors: string[] = [];
    const browser = await chromium.launch({ args: ["--no-sandbox"], headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const login = async () => {
        try {
            await page.goto('https://kr-hometour.suumo.jp/login');
            await page.waitForLoadState("networkidle");
            await page.fill('xpath=/html/body/div/div/div/div/main/div/form/div[1]/div/div/input', suumo_kaeru_id);
            await page.fill('xpath=/html/body/div/div/div/div/main/div/form/div[2]/div/div/input', suumo_kaeru_pass);
            await page.click('xpath=/html/body/div/div/div/div/main/div/form/div[3]/button');
        } catch (err) {
            const msg = `ログイン処理に失敗${err}`;
            console.log(msg);
            errors.push(msg);
        }
    };

    /**
     * 一覧の画面を開き、「検索結果をダウンロード」→ 確認のボタンで CSV を保存する（顧客ごと・反響ごとで同じ手順）。
     * ⚠️ 失敗したら例外を投げる（呼び出し元が理由を残す）。
     */
    const downloadCsv = async (listUrl: string, savePath: string, label: string): Promise<void> => {
        await page.goto(listUrl);
        await page.waitForLoadState("networkidle");

        // ★ 対策1: SUUMOのようなSPAは、ネットワーク通信が終わってから
        // HTML(ボタン)が描画されるまでにタイムラグがあるため、ここで必ず数秒待ちます。
        await page.waitForTimeout(5000);

        // ★ 対策2: ボタンが「確実に見える状態」になるまで待ってからクリックする
        // exact: false を入れることで、前後のスペース等による不一致を防ぎます
        const downloadBtn = page.getByText('検索結果をダウンロード', { exact: false }).first();
        await downloadBtn.waitFor({ state: 'visible', timeout: 30000 });
        await downloadBtn.click();
        console.log(`[${label}]「検索結果をダウンロード」をクリックしました。`);

        await page.waitForTimeout(2000);

        // ★ 対策5: XPathは画面構造が1ミリでも変わると壊れるため、要素の出現をしっかり待機する
        const confirmBtn = page.locator('xpath=/html/body/div[2]/div[2]/div[2]/div/div/div[2]/button[2]');
        await confirmBtn.waitFor({ state: 'visible', timeout: 30000 });
        console.log(`[${label}] ダウンロード確認ボタンをクリックします...`);

        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 120000 }),
            confirmBtn.click()
        ]);
        await download.saveAs(savePath);
        console.log(`[${label}] ダウンロードしました: ${download.suggestedFilename()}`);
    };

    /** 顧客ごとの CSV → ① の suumo_db_kaeru（⚠️ 反響一覧には足さない。Dashboard v2.2.263 から反響ごとの CSV が足す） */
    const importCustomers = async () => {
        try {
            const savePath = '/tmp/customer.csv';
            await downloadCsv('https://kr-hometour.suumo.jp/customers', savePath, 'SUUMO 顧客');
            await importSuumoKaeruCustomers(savePath, errors);
        } catch (err) {
            const msg = `顧客ごとの CSV のダウンロードに失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
    };

    /**
     * 反響ごとの CSV → ② の suumo_kaeru:actions（反響一覧に1反響1行。2026-11-11・Dashboard v2.2.263）
     * ⚠️ 顧客のあとに動かす（② が反響を顧客に結ぶのに、顧客の表を使う）。顧客の取り込みが失敗していても動かす。
     */
    const importActions = async () => {
        try {
            const savePath = '/tmp/action.csv';
            await downloadCsv('https://kr-hometour.suumo.jp/actions', savePath, 'SUUMO 反響');
            await importSuumoKaeruActions(savePath, errors);
        } catch (err) {
            const msg = `反響ごとの CSV のダウンロードに失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
    };

    try {
        await login();
        await importCustomers();
        await importActions();
    } catch (err) {
        const msg = `処理全体が中断しました: ${err}`;
        console.error(msg);
        errors.push(msg);
    } finally {
        // 例外が起きても Chromium を必ず終了させる。
        // 閉じ残るとメモリを圧迫し、後続タスクや次回以降の実行まで巻き込んで失敗する。
        await closeBrowser(browser);
        await sendErrorMail(errors, 'runSuumoKaeru.ts');
    }
};
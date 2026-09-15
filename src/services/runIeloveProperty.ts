import { chromium } from 'playwright';
// モジュール外のヘルパーからも参照するため宣言はここに置き、実行開始時にリセットする。
const errors: string[] = [];
import { readFile, writeFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import axios from 'axios';
import { closeBrowser, DOWNLOAD_TIMEOUT, logPageState } from "../utils/portalPage";
import { sendErrorMail } from "./sendErrorMail";
import iconv from 'iconv-lite';
import * as fs from 'fs';

// 日本語ヘッダー列を英語キーに変換する辞書
const propertyHeaderMap: Record<string, string> = {
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

const postToPhpApi = async (data: Record<string, string>[]) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        data: data,
        request: 'property_db_update'
    };
    try {
        const response = await axios.post(API_URL, payload, { headers: { "Content-Type": "application/json" } });
        console.log("DB登録成功:", response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`APIエラー: ${error.response?.status} ${error.response?.statusText}`);
            console.error("エラー詳細:", error.response?.data);
            errors.push(`API送信エラー: ${error.response?.status}`);
        } else {
            console.error("API送信中に予期せぬエラーが発生しました:", error);
            errors.push(`API予期せぬエラー`);
        }
    }
};

export const runIeloveProperty = async (ielove_id: string, ielove_pass: string) => {
    // 前回実行のエラーが持ち越されないよう、実行の都度クリアする。
    errors.length = 0;

    /**
     * ⚠️⚠️ **致命的なエラーがあったか。** 最後に throw して呼び出し側へ伝える。
     *
     *   2026-09-09 まで、ログイン失敗で「致命的なエラーにより処理を中断しました」と
     *   出しているのに**例外を投げずに正常終了**していた。そのため
     *   portalService の応答は `{ name: 'property', ok: true }` になり、
     *   失敗が応答から消えていた。
     *
     * ⚠️ errors はモジュールスコープなので毎回 length = 0 でリセットしている。
     *   fatal は関数スコープなのでその必要は無い。
     */
    let fatal = false;
    // HerokuのLinux環境でクラッシュを防ぐための引数を追加
    // ★ 修正: Heroku環境でのクラッシュ防止 ＆ Bot検知回避の引数を追加
    const browser = await chromium.launch({
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled" // 自動操作ツールであることを隠す
        ],
        headless: true
    });

    // ★ 修正: 画面サイズをフルHDに固定し、User-Agent（ブラウザ情報）を一般的なPCに偽装
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'ja-JP',
        timezoneId: 'Asia/Tokyo'
    });
    const page = await context.newPage();

    /**
     * ログイン欄のセレクタ。
     *
     * ─────────────────────────────────────────────
     * ⚠️⚠️ **絶対XPathをやめた。**
     *
     *   2026-09-09 の実行で timeout した:
     *     page.fill: waiting for locator(
     *       'xpath=/html/body/div[2]/article/div/section[2]/div[1]/dl/form/dd/ul/li[2]/input')
     *
     *   絶対XPathは div が1つ増えるだけで壊れる。
     *
     * ⚠️ 代わりに「パスワード欄を含む form」を起点にした相対指定にする。
     *   ログイン画面にパスワード欄があるのは構造が変わっても揺らがない。
     *   ⚠️ name / id 属性は実物を見ずには決められないので推測しない。
     *
     * ⚠️ 旧XPathも候補に残す。新セレクタで取れない画面（別レイアウト）が
     *   あった場合の保険。上から順に試す。
     * ─────────────────────────────────────────────
     */
    const LOGIN_FORM = 'form:has(input[type="password"])';
    const ID_SELECTORS = [
        // パスワード欄と同じ form の中の、最初のテキスト系入力
        `${LOGIN_FORM} input:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="submit"]):not([type="button"])`,
        // ⚠️ 旧実装（2026-09-09 に timeout した）
        'xpath=/html/body/div[2]/article/div/section[2]/div[1]/dl/form/dd/ul/li[1]/input',
    ];
    const PASS_SELECTORS = [
        `${LOGIN_FORM} input[type="password"]`,
        'xpath=/html/body/div[2]/article/div/section[2]/div[1]/dl/form/dd/ul/li[2]/input',
    ];
    const SUBMIT_SELECTORS = [
        `${LOGIN_FORM} button[type="submit"]`,
        `${LOGIN_FORM} input[type="submit"]`,
        `${LOGIN_FORM} button`,
        // ⚠️ ielove は <p> をボタンとして使っている（旧実装のまま）
        'xpath=/html/body/div[2]/article/div/section[2]/div[1]/dl/form/dd/p',
    ];

    /**
     * 候補を順に試して、最初に使えたものを使う。
     * ⚠️ 1つあたりの待ち時間を短くする。候補が4つあるので、
     *   既定の30秒だと全部外れたときに2分待つことになる。
     */
    const fillFirst = async (selectors: string[], value: string, label: string) => {
        for (const selector of selectors) {
            const ok = await page
                .locator(selector)
                .first()
                .fill(value, { timeout: 5000 })
                .then(() => true)
                .catch(() => false);
            if (ok) return selector;
        }
        // ⚠️⚠️ 全部外れたら、次回セレクタを直せるようHTMLとPNGを保存する。
        //   保存せずに throw すると、また同じ推測を繰り返すことになる
        await logPageState(page, `ielove-login-${label}`);
        throw new Error(
            `ielove のログイン欄（${label}）が見つかりませんでした。` +
            '保存したHTMLとスクリーンショットでフォームの構造を確認してください。'
        );
    };

    const clickFirst = async (selectors: string[], label: string) => {
        for (const selector of selectors) {
            const ok = await page
                .locator(selector)
                .first()
                .click({ timeout: 5000 })
                .then(() => true)
                .catch(() => false);
            if (ok) return selector;
        }
        await logPageState(page, `ielove-login-${label}`);
        throw new Error(`ielove のログインボタン（${label}）が見つかりませんでした。`);
    };

    const login = async () => {
        try {
            await page.goto('https://cloud.ielove.jp/');
            await page.waitForLoadState("networkidle");

            const idSelector = await fillFirst(ID_SELECTORS, ielove_id, 'id');
            const passSelector = await fillFirst(PASS_SELECTORS, ielove_pass, 'pass');
            const submitSelector = await clickFirst(SUBMIT_SELECTORS, 'submit');
            // ⚠️ どのセレクタで通ったかを残す。旧XPathで通ったなら
            //   新セレクタが効いていないということなので、直す手がかりになる
            console.log(`[ielove] ログイン欄: id=${idSelector} / pass=${passSelector} / submit=${submitSelector}`);

            await page.waitForLoadState("networkidle");
        } catch (err) {
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

                await page.waitForTimeout(5000);


                // 一覧をダウンロードボタンのクリック（待機時間を60秒に延長）
                const downloadBtn = page.locator('#listDownloadFooter');
                await downloadBtn.waitFor({ state: 'visible', timeout: 60000 });
                await downloadBtn.click();

                // CSV形式でダウンロードボタンのクリック
                const csvBtn = page.locator('#bukkaku_csv_download');
                await csvBtn.waitFor({ state: 'visible' });

                // ダウンロードイベントのキャッチ
                const [download] = await Promise.all([
                    page.waitForEvent('download', { timeout: DOWNLOAD_TIMEOUT }),
                    csvBtn.click()
                ]);

                const filePath = await download.path();
                if (!filePath) {
                    throw new Error(`店舗ID: ${storeId} のファイルダウンロードに失敗しました`);
                }

                // Shift-JISからUTF-8に変換
                const buffer = fs.readFileSync(filePath);
                let utf8CsvText = iconv.decode(buffer, 'Shift_JIS');

                // エクセルのゼロ落ち防止用フォーマットを強制クリーニング
                utf8CsvText = utf8CsvText.replace(/="/g, '"');

                const records = parse(utf8CsvText, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true
                }) as Record<string, string>[];

                // 取得日 (yyyy/mm/dd)
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const registeredDate = `${yyyy}/${mm}/${dd}`;

                const finalRecords: Record<string, string>[] = [];

                for (const record of records) {
                    const mappedRecord: Record<string, string> = {};
                    for (const [jaKey, value] of Object.entries(record)) {
                        if (jaKey.startsWith('オリジナル項目')) continue;

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

            } catch (err) {
                // ★ 追加: エラーが起きた瞬間の「実際のURL」と「画面タイトル」を取得する
                const currentUrl = page.url();
                const pageTitle = await page.title().catch(() => '取得不可');

                const msg = `[店舗: ${storeId}] の処理中にエラーが発生しました: ${err}\n👉 【デバッグ】現在地URL: ${currentUrl}\n👉 【デバッグ】画面タイトル: ${pageTitle}`;
                console.error(msg);
                errors.push(msg);
                // エラーが起きても continue で次の店舗の処理へ進む
            }
        }
    };

    try {
        await login();
        await propertySearch();
    } catch (e) {
        const msg = `致命的なエラーにより処理を中断しました: ${e}`;
        console.error(msg);
        errors.push(msg);
        fatal = true;
    } finally {
        // ブラウザを確実に閉じる
        await closeBrowser(browser);
        // ⚠️ エラーが無いときは送らない。以前は無条件に呼んでいた
        if (errors.length > 0) {
            await sendErrorMail(errors, 'runIeloveProperty.ts');
        }
    }

    /**
     * ⚠️⚠️ **致命的なエラーは呼び出し側へ投げる。**
     *   2026-09-09 まで、ログイン失敗で「致命的なエラーにより処理を中断しました」と
     *   出しているのに例外を投げずに正常終了していた。そのため portalService の
     *   応答は `{ name: 'property', ok: true }` になり、失敗が消えていた。
     *
     * ⚠️ finally の**後**に置くこと。finally の中で throw すると
     *   closeBrowser が終わる前に抜けて Chromium が残る。
     */
    if (fatal) {
        throw new Error(errors.join(' / '));
    }
};
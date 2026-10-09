import { Browser, Locator, Page } from "playwright";
import { writeFile } from "fs/promises";
// ⚠️ 診断用のHTML／スクリーンショットの保存先。CSV と同じ一時ディレクトリに置く
import { portalTmpPath } from "./portalCsv";

/**
 * ポータルサイトのスクレイピングで共通して使う待機・判定処理。
 *
 * 個々のサービスがタイムアウトや 0 件判定を各自で持つと、
 * ある媒体の画面変更が処理全体の停止につながるため、ここに集約する。
 */

/** ページ遷移の待機時間 */
export const NAVIGATION_TIMEOUT = 90000;
/**
 * CSV 生成に時間がかかることがあるため、ダウンロード開始は長めに待つ。
 *
 * ⚠️⚠️ ALLGRIT は**ボタンを押してから実際にダウンロードが始まるまでラグがある**
 *   （サーバー側で CSV を生成してから配信している）。
 *   短くすると「押したのに始まらない」で失敗する。
 */
export const DOWNLOAD_TIMEOUT = 180000;
/**
 * 一覧の行が描画されるまで待つ時間。
 *
 * ⚠️ SPA（Vuetify のデータ表）は XHR で行を描くため、`networkidle` の後でも
 *   表がまだ空のことがある。0件判定の前にこれだけ待つ。
 *   ⚠️ 本当に0件のときはこの時間だけ余計に待つことになるが、
 *     データがあるのに飛ばすほうが被害が大きい。
 */
export const LIST_RENDER_TIMEOUT = 30000;
/**
 * 要素が描画されるまでの待機時間。
 * ページの読み込み完了を待った後の判定なので、これ以上待っても現れない。
 */
export const ELEMENT_TIMEOUT = 20000;
/**
 * SPA（Vue / Vuetify）の画面で要素を待つ時間。
 *
 * ⚠️⚠️ ELEMENT_TIMEOUT の「読み込み完了後なら現れる」という前提は
 *   SPA では成り立たない。`load` が発火した時点ではまだ JS が
 *   一覧を取得しておらず、描画は数十秒後になることがある。
 *   実際に ALLGRIT のアカウント選択画面で
 *   「ブラウザでは見えているのに見つからない」が発生した。
 */
export const SPA_ELEMENT_TIMEOUT = 45000;
/** テキストによる代替検出の待機時間 */
export const FALLBACK_TIMEOUT = 5000;

/**
 * 「データが無い」と断定できる文言。
 *
 * ⚠️ これは**明示的に無いと言っている**ものだけを入れる。
 *   数値の「0件」は入れない（下の EMPTY_COUNT_PATTERN を参照）。
 */
const NO_DATA_PATTERN = /該当[^。\n]{0,20}(ありません|見つかりません)|データがありません|表示するデータがありません/;

/**
 * 「0件」という数値表記。
 *
 * ⚠️⚠️ **これ単体では 0件 と判断できない。**
 *
 *   ALLGRIT のダッシュボードには
 *     「対応必要なメール/SMS 対応必要メッセージ: 0件」
 *   のような集計ウィジェットがある。実際にこれで
 *   **168行あるお客様一覧を「0件」と誤判定してスキップしていた。**
 *
 *   そのため行数が取れているときは**行数を優先**し、
 *   この文言は「行が1件も無いとき」の補助判定にしか使わない。
 *
 * ⚠️ 「全10件」を拾わないよう、直前が数字でない場合のみ一致させる。
 */
const EMPTY_COUNT_PATTERN = /(?<![0-9])0\s*件/;

/** ダウンロードを促す要素の文言 */
const DOWNLOAD_TEXT_PATTERN = /ダウンロード|CSV|ＣＳＶ/;

/** クリック可能な要素として扱うセレクタ */
const CLICKABLE = "button, input[type=button], input[type=submit], a";

/** 0件判定の結果。⚠️ 「なぜそう判定したか」まで返す */
export type EmptyCheck = {
    empty: boolean;
    /** ログに出す理由 */
    reason: string;
    /** table tbody tr の数。-1 は取得に失敗 */
    rowCount: number;
};

/**
 * 一覧にデータが無いかを判定する。
 * 0 件のときダウンロードが発火せず waitForEvent だけがタイムアウトするため、
 * クリック前に判定してスキップできるようにする。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **この判定は「本当に0件」と「画面が違う／描画が間に合っていない」を
 *   区別できない。** どちらでも `empty: true` になる。
 *
 *   誤ってスキップする典型例
 *     ・目的の一覧に到達していない（前の画面のまま）
 *       → その画面に `<table>` が無ければ rowCount = 0 で 0件扱い
 *     ・SPA が XHR で行を描画する前に判定した
 *       → 一瞬だけ rowCount = 0
 *     ・画面のどこかに「0件」という別の表示がある
 *       → 例: 集計ウィジェットの「未対応 0件」
 *
 *   そのため **理由を必ず返し、呼び出し側でログと画面の状態を残す**。
 *   「0件でスキップ」だけのログでは原因が追えない。
 * ─────────────────────────────────────────────
 */
export const inspectRecords = async (page: Page): Promise<EmptyCheck> => {
    const rowCount = await page.locator("table tbody tr").count().catch(() => -1);
    const bodyText = await page.locator("body").innerText().catch(() => "");

    // ⚠️ 明示的に「ありません」と書かれている場合だけは、行数より優先して信じる。
    //   空状態のプレースホルダ行が1行だけある実装があるため。
    const noData = bodyText.match(NO_DATA_PATTERN);
    if (noData !== null) {
        return {
            empty: true,
            rowCount,
            reason: `データ無しの文言に一致「${noData[0].replace(/\s+/g, " ").trim()}」`,
        };
    }

    // ⚠️⚠️ **行が1件でもあればデータありとする。**
    //   以前は本文の「0件」を見ていたため、ダッシュボードの集計
    //   （「対応必要メッセージ: 0件」）に釣られて、168行ある一覧を
    //   スキップしていた。行数のほうが信頼できる。
    if (rowCount > 0) {
        const stray = bodyText.match(EMPTY_COUNT_PATTERN);
        if (stray !== null) {
            // ⚠️ 「0件」という表示は残っているが行はある。集計値の可能性が高い。
            //   スキップせず、気づけるようにログだけ出す。
            console.log(
                `⚠️ 画面に「${stray[0].trim()}」の表示がありますが、` +
                `表には ${rowCount} 行あるため取り込みを続行します（集計値の可能性）`
            );
        }
        return { empty: false, rowCount, reason: `${rowCount}行を検出` };
    }

    if (rowCount === 0) {
        // ⚠️ ここがいちばん誤判定しやすい。「表が無い」＝「0件」ではない
        return {
            empty: true,
            rowCount,
            reason: "table tbody tr が0件（⚠️ 一覧に到達していない／描画前の可能性あり）",
        };
    }

    // rowCount が -1（取得に失敗）。⚠️ データ有無を判断できないので続行する。
    //   ここで空扱いにすると、取得できなかっただけで取り込みを飛ばす
    return { empty: false, rowCount, reason: "行数を取得できなかったため続行" };
};

/**
 * 一覧にデータが無いか（真偽値だけ欲しい場合）。
 * ⚠️ 理由が要るときは inspectRecords を使うこと。
 */
export const hasNoRecords = async (page: Page): Promise<boolean> =>
    (await inspectRecords(page)).empty;

/**
 * 指定セレクタの要素を待つ。見つからなければ null を返す（例外を投げない）。
 */
export const findElement = async (
    page: Page,
    selector: string,
    timeout: number = ELEMENT_TIMEOUT
): Promise<Locator | null> => {
    const locator = page.locator(selector).first();
    try {
        await locator.waitFor({ state: "visible", timeout });
        return locator;
    } catch {
        return null;
    }
};

/**
 * ダウンロードボタンを探す。見つからなければ null。
 * 固定セレクタは画面構成の変更で壊れるため、文言による検出にフォールバックする。
 */
export const findDownloadButton = async (
    page: Page,
    selector: string
): Promise<Locator | null> => {
    const bySelector = await findElement(page, selector);
    if (bySelector !== null) return bySelector;

    const byText = page.locator(CLICKABLE).filter({ hasText: DOWNLOAD_TEXT_PATTERN }).first();
    try {
        await byText.waitFor({ state: "visible", timeout: FALLBACK_TIMEOUT });
        console.log("ダウンロードボタンを文言から検出しました（セレクタは不一致）");
        return byText;
    } catch {
        return null;
    }
};

/**
 * スキップ時に「機能が無い」のか「セレクタが壊れた」のかを切り分けられるよう、
 * 画面の状態をログに残す。
 */
export const logPageState = async (page: Page, label: string): Promise<void> => {
    const texts = await page.locator(CLICKABLE).allInnerTexts().catch(() => [] as string[]);
    const visible = texts.map(t => t.trim().replace(/\s+/g, " ")).filter(t => t !== "").slice(0, 30);
    const size = page.viewportSize();

    console.log(
        `${label}: url=${page.url()} viewport=${size ? `${size.width}x${size.height}` : "不明"} ` +
        `検出した操作要素(${texts.length}件)=[${visible.join(" / ")}]`
    );

    // ⚠️⚠️ HTML とスクリーンショットを残す。
    //   「ブラウザで見ると要素があるのに見つからない」という報告は、
    //   コンソールの文言だけでは原因を絞れない（描画待ち不足／ビューポート差／
    //   絶対位置のセレクタがずれた、のどれか判別できない）。
    //   実物を残せば次の失敗で原因が確定する。
    //
    // ⚠️ 保存の失敗で本処理を止めないこと。診断のための付加機能である。
    const stamp = `${label.replace(/[^0-9A-Za-z぀-ヿ一-鿿]/g, "_")}_${Date.now()}`;
    try {
        const htmlPath = portalTmpPath(`${stamp}.html`);
        await writeFile(htmlPath, await page.content(), "utf8");
        console.log(`  ページHTMLを保存しました: ${htmlPath}`);
    } catch (err) {
        console.error("  ページHTMLの保存に失敗しました:", err);
    }
    try {
        const pngPath = portalTmpPath(`${stamp}.png`);
        await page.screenshot({ path: pngPath, fullPage: true });
        console.log(`  スクリーンショットを保存しました: ${pngPath}`);
    } catch (err) {
        console.error("  スクリーンショットの保存に失敗しました:", err);
    }
};

/**
 * 要素が見つかるまで、ページを読み込み直しながら数回試す。
 *
 * ⚠️ SPA（Vue / Vuetify）のポータルでは `waitUntil: "load"` の時点で
 *   一覧がまだ描画されていない。`load` 後に待つだけでは足りず、
 *   取得が遅れた場合は**再読み込みが要る**。
 *
 * ⚠️ 呼び出し側で `page.goto` した直後に使うこと。
 *   この関数は2回目以降に `page.reload()` を行う。
 */
export const findElementWithReload = async (
    page: Page,
    selector: string,
    options: { attempts?: number; timeout?: number; label?: string } = {}
): Promise<Locator | null> => {
    const attempts = options.attempts ?? 3;
    const timeout = options.timeout ?? SPA_ELEMENT_TIMEOUT;
    const label = options.label ?? "要素";

    for (let i = 1; i <= attempts; i++) {
        if (i > 1) {
            console.log(`${label}_${i}回目の試行のため再読み込みします`);
            await page
                .reload({ waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT })
                .catch(err => console.error(`${label}_再読み込みに失敗しました:`, err));
        }

        // ⚠️ networkidle の後もフレームワークの描画が残っていることがある。
        //   ごく短い固定待ちを入れる（ここを削ると1回目の成功率が落ちる）。
        await page.waitForTimeout(1000);

        const found = await findElement(page, selector, timeout);
        if (found !== null) {
            if (i > 1) console.log(`${label}_${i}回目で見つかりました`);
            return found;
        }
        console.log(`${label}_${i}/${attempts}回目は見つかりませんでした（${timeout}ms 待機）`);
    }
    return null;
};

/**
 * ブラウザを確実に閉じる。close 自体の失敗で後続処理を止めないよう例外を握る。
 * Chromium が閉じ残るとメモリを圧迫し、次回以降の実行全体が失敗するため必ず呼ぶ。
 */
export const closeBrowser = async (browser: Browser | undefined): Promise<void> => {
    if (!browser) return;
    try {
        await browser.close();
    } catch (err) {
        console.error("ブラウザの終了に失敗しました:", err);
    }
};

export type DownloadOptions = {
    /** 遷移先。既に目的のページにいる場合は省略する */
    url?: string;
    /** ダウンロードボタンのセレクタ */
    selector: string;
    /** 保存先パス */
    filePath: string;
    /** ログに出す識別名 */
    label: string;
    /** 0 件判定を行うか（一覧画面でない場合は false） */
    checkEmpty?: boolean;
    /**
     * 一覧の行が描画されるまで待つ時間。
     *
     * ⚠️ SPA は XHR で行を描くため、`networkidle` の後でも間に合わないことがある。
     *   待たずに 0件 判定すると、データがあるのに取り込みを丸ごと飛ばす。
     */
    listTimeout?: number;
    /**
     * ダウンロードが始まるまで待つ時間。
     *
     * ⚠️⚠️ **ALLGRIT はボタンを押してから実際にダウンロードが始まるまで
     *   数十秒かかる。** サーバー側で CSV を生成しているため。
     *   短くすると「押したのに始まらない」で失敗する。
     */
    downloadTimeout?: number;
    /**
     * ダウンロードボタンを押したあとに出る確認モーダルの、押すべき要素（2026-10-09 追加）。
     *
     * ⚠️ ALLGRIT は 2026-10 のページ改修で、ダウンロードボタンを押すと
     *   **小さなモーダルが開き、その中の項目を押して初めてダウンロードが始まる**ようになった。
     * ⚠️ 指定したときだけ「ボタン → モーダルの項目」の2段で押す。
     *   ⚠️ 省略すれば従来どおりボタン1回（⚠️ 他のポータルは変わらない）。
     * ⚠️ `/` で始まる値は XPath として扱う。
     */
    confirmSelector?: string;
    /** 確認モーダルの項目が出るまで待つ時間（既定 30 秒） */
    confirmTimeout?: number;
};

/**
 * CSV をダウンロードして保存する。
 * 対象データが 0 件、またはダウンロードボタンが存在しない場合は null を返す
 * （エラーではなくスキップ扱い）。
 */
export const downloadCsvFile = async (
    page: Page,
    options: DownloadOptions
): Promise<string | null> => {
    const {
        url,
        selector,
        filePath,
        label,
        checkEmpty = true,
        listTimeout = LIST_RENDER_TIMEOUT,
        downloadTimeout = DOWNLOAD_TIMEOUT,
        confirmSelector,
        confirmTimeout = 30000,
    } = options;

    if (url) {
        await page.goto(url, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT });
    }

    if (checkEmpty) {
        // ⚠️⚠️ **0件判定の前に、一覧の行が描画されるのを待つ。**
        //   SPA は XHR で行を描くため、networkidle の後でも表がまだ空のことがある。
        //   待たずに判定すると「描画前だった」だけで取り込みを丸ごと飛ばす。
        //   ⚠️ 出なかった場合は本当に0件の可能性があるので、例外にせず判定に進む。
        await page
            .locator("table tbody tr")
            .first()
            .waitFor({ state: "visible", timeout: listTimeout })
            .catch(() => undefined);

        const check = await inspectRecords(page);
        if (check.empty) {
            // ⚠️ 理由と URL を必ず出す。「0件でスキップ」だけでは
            //   本当に0件なのか、画面が違うのか区別できない
            console.log(`${label}: 対象データが0件のためスキップしました（理由: ${check.reason} / url=${page.url()}）`);
            // ⚠️ 画面の状態を残す。誤スキップなら HTML を見れば分かる
            await logPageState(page, `${label}_0件判定`);
            return null;
        }
        console.log(`${label}: 一覧を検出しました（${check.reason}）`);
    }

    const button = await findDownloadButton(page, selector);
    if (button === null) {
        console.log(`${label}: ダウンロードボタンが無いためスキップしました`);
        await logPageState(page, label);
        return null;
    }

    // ⚠️⚠️ セレクタが `.../button[4]/span` のように **span を指している**ことがある。
    //   span に isDisabled() を聞いても常に false が返り、無効なボタンを
    //   押してしまう。ボタン要素まで遡って判定する。
    const clickable = button.locator("xpath=ancestor-or-self::button[1]");
    const target = (await clickable.count()) > 0 ? clickable.first() : button;

    if (await target.isDisabled().catch(() => false)) {
        console.log(`${label}: ダウンロードボタンが無効のためスキップしました`);
        await logPageState(page, `${label}_ボタン無効`);
        return null;
    }

    // ⚠️ 画面外にあるとクリックが空振りすることがある
    await target.scrollIntoViewIfNeeded().catch(() => undefined);

    // ⚠️⚠️ **押してから実際に始まるまでラグがある。**
    //   ALLGRIT はサーバー側で CSV を生成してから配信するため、
    //   クリック直後には何も起こらない。ログだけ見ると固まったように見える。
    //   ・待ち受けを **クリックより先に** 登録する（Promise.all の順序が重要）
    //   ・待ち時間を長く取る
    //   ・待っていることをログに出す
    console.log(
        `${label}: ダウンロードを開始します。` +
        `⚠️ このサイトは押してから始まるまでにラグがあります（最大 ${Math.round(downloadTimeout / 1000)} 秒待機）`
    );

    const startedAt = Date.now();
    const elapsed = (): string => ((Date.now() - startedAt) / 1000).toFixed(1);

    // ⚠️ 待っている間に生存を示す。無言で数分黙ると異常と区別できない
    const heartbeat = setInterval(() => {
        console.log(`${label}: ダウンロード待機中… ${elapsed()}秒`);
    }, 30000);

    /**
     * 押す操作（2026-10-09 に確認モーダルへ対応）。
     *   ・confirmSelector なし … ボタンを1回押す（従来どおり）
     *   ・confirmSelector あり … ボタン → モーダルの項目が出るのを待つ → 項目を押す
     * ⚠️ 項目が出なければ画面を保存して投げる（⚠️ 「ダウンロードが始まらない」と区別できるように）。
     */
    const clickToStart = async (): Promise<void> => {
        await target.click();
        if (!confirmSelector) return;

        const confirm = page
            .locator(confirmSelector.startsWith("/") ? `xpath=${confirmSelector}` : confirmSelector)
            .first();
        try {
            await confirm.waitFor({ state: "visible", timeout: confirmTimeout });
        } catch (err) {
            console.log(
                `${label}: ダウンロードの確認モーダルが開きませんでした（${Math.round(confirmTimeout / 1000)}秒待機）。` +
                `⚠️ モーダルの作りが変わっていないか、保存した画面を確認してください`
            );
            await logPageState(page, `${label}_確認モーダル`);
            throw err;
        }
        console.log(`${label}: 確認モーダルの項目を押します`);
        await confirm.click();
    };

    let download;
    try {
        // ⚠️ waitForEvent を先に置くこと。click を先に await すると、
        //   ラグが無い場合に download イベントを取りこぼす。
        // ⚠️ 確認モーダルがある場合も同じ。待ち受けを先に登録してから「ボタン → 項目」を押す。
        [download] = await Promise.all([
            page.waitForEvent("download", { timeout: downloadTimeout }),
            clickToStart(),
        ]);
    } catch (err) {
        clearInterval(heartbeat);
        console.log(
            `${label}: ダウンロードが始まりませんでした（${elapsed()}秒待機）。` +
            `⚠️ 確認ダイアログや別タブでの配信になっていないか、保存した画面を確認してください`
        );
        // ⚠️ 画面の状態を残してから投げ直す。
        //   握りつぶすと「0件だった」と区別できずエラーメールも飛ばない。
        await logPageState(page, `${label}_ダウンロード待ち`);
        throw err;
    }
    clearInterval(heartbeat);

    console.log(`${label}: ダウンロード開始まで ${elapsed()}秒かかりました`);

    await download.saveAs(filePath);
    return filePath;
};

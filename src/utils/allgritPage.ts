import { Locator, Page } from "playwright";
import { findElement, logPageState, NAVIGATION_TIMEOUT, SPA_ELEMENT_TIMEOUT } from "./portalPage";

/**
 * ALLGRIT（line-saas.auka.jp/builder）の画面操作。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ なぜ専用ファイルにしたのか
 *
 *   ALLGRIT は Nuxt + Vuetify の SPA で、これまで
 *
 *     //html/body/div[2]/div/div/div/main/div/div/div/div/div/div[2]/div[1]/div[3]/button
 *
 *   のような **絶対位置の XPath** で操作していた。div の番号が1つずれるだけで
 *   壊れるため「ブラウザでは見えているのにボタンが見つからない」が起きていた。
 *
 *   2026-09-08 に実際の DOM を確認し、**アカウント名で引く**方式に変えた。
 *   注文（runAllgritOrder）と建売（runAllGritKaeru）が同じ画面を触るため、
 *   ここ1箇所に集約する。
 * ─────────────────────────────────────────────
 */

/** アカウント選択画面（ブランド切替の起点） */
export const BUILDER_TOP = "https://line-saas.auka.jp/builder/";

/** ログイン画面 */
export const BUILDER_LOGIN = "https://line-saas.auka.jp/builder/login";

/**
 * お客様一覧。
 *
 * ⚠️⚠️ **左メニューを辿らず、ここへ直接遷移する。**
 *
 *   左メニューの「お客様一覧」は入れ子メニュー（`.side-menu`）の中にあり、
 *   その `.side-menu` は **`style="display: none;"`** で閉じている。
 *   Playwright は非表示の要素をクリックできないため、メニュー経由では
 *   ・`waitFor({ state: "visible" })` が失敗する
 *   ・旧セレクタにフォールバックして**別の項目（ダッシュボード）を押す**
 *   という状態になっていた（実際に url=/builder/dashboard で止まっていた）。
 *
 *   保存された画面のHTMLを見ると、項目は素の `<a href>` だった。
 *
 *     <a href="/builder/dashboard">ダッシュボード</a>
 *     <a href="/builder/customers">お客様一覧</a>   ← これ
 *     <a href="/builder/tasks">タスク管理</a>
 *
 *   URL が分かっているので直接開くのがいちばん確実で速い。
 *
 * ⚠️ どのアカウントの一覧が出るかはサーバー側のセッションで決まる。
 *   先に openAllgritAccount() でアカウントを切り替えてから遷移すること。
 */
export const BUILDER_CUSTOMERS = "https://line-saas.auka.jp/builder/customers";

/**
 * ログイン画面の入力欄。
 *
 * ⚠️⚠️ **Vuetify の自動採番 id（`#input-15` / `#input-19`）を使ってはいけない。**
 *   描画順で採番されるため、画面構成が変わると番号がずれる。
 *
 * ⚠️ 絶対位置の XPath も使わない。`v-input__slot > v-text-field__slot > input`
 *   のように Vuetify のラッパー div が何層も入っており、1層数え間違えると
 *   0件になる（実際に過去そうなっていた）。
 *   placeholder と type で引くのがいちばん壊れにくい。
 */
const LOGIN_MAIL = 'input[placeholder="メールアドレスを入力"]';
const LOGIN_PASS = 'form input[type="password"]';
const LOGIN_SUBMIT = 'form button[type="submit"]';

/**
 * ALLGRIT に登録されている LINE アカウント名。
 *
 * ⚠️⚠️ **`国分ハウジンググループ` は `国分ハウジンググループ イベント情報` の
 *   前方一致になる。** 部分一致で引くと2枚のカードが該当してしまうため、
 *   下の `exactText()` で完全一致にしている。
 *
 * ⚠️ アカウント選択画面のカードの並び（2026-09-08 時点）
 *     1枚目 国分ハウジンググループ            友達数 5,036  ← 注文 KH
 *     2枚目 国分ハウジンググループ イベント情報 友達数 4,345  ← 未使用
 *     3枚目 デイジャストハウス                友達数   677  ← 注文 DJH
 *     4枚目 かえるホーム公式                  友達数 1,275  ← 建売
 *   旧セレクタの div[1] / div[3] / div[4] はこの並びに対応していた。
 *   ⚠️ アカウントが増減すると番号がずれる。名前で引くのが目的。
 */
export const ALLGRIT_ACCOUNT = {
    /** 注文事業の KH */
    KH: "国分ハウジンググループ",
    /** 注文事業の DJH */
    DJH: "デイジャストハウス",
    /** 建売分譲事業 */
    KAERU: "かえるホーム公式"
} as const;

/** 完全一致の正規表現を作る。⚠️ 前後の空白は DOM に実在する（`<p> 国分…`） */
const exactText = (text: string): RegExp =>
    new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`);

/**
 * ALLGRIT にログインする。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **`waitForLoadState("load")` では login を待てない。**
 *
 *   ALLGRIT は Nuxt の SPA で、ログインは
 *     ① 送信ボタンのクリック → XHR で認証
 *     ② 成功したらクライアント側で画面を切り替える
 *   という流れ。document は最初から loaded なので
 *   `waitForLoadState("load")` は**即座に解決してしまう**。
 *
 *   以前のコードはこれで「ログイン完了」と表示して次へ進んでいた。
 *   その結果、認証が終わる前に `/builder/` へ遷移し、セッションが無いため
 *   `/builder/login` へ戻され、「ログイン画面で止まっている」ように見えていた。
 *
 *   ここでは**アカウント一覧（.line-account-name）が現れること**を
 *   成功の判定に使う。これが出れば確実に認証は通っている。
 * ─────────────────────────────────────────────
 *
 * ⚠️ 成功したら true。失敗したら false を返し、画面の状態を保存する。
 *   例外は投げない（呼び出し側でエラーメールに載せるため）。
 */
export const loginToAllgrit = async (
    page: Page,
    email: string,
    password: string,
    label: string
): Promise<boolean> => {
    if (email === "" || password === "") {
        console.log(`${label}_認証情報が未設定のためログインできません`);
        return false;
    }

    await page
        .goto(BUILDER_LOGIN, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT })
        .catch(err => console.error(`${label}_ログイン画面への遷移に失敗しました:`, err));

    // ⚠️ フォームが描画されるまで待つ。SPA なので goto の直後には無い
    const mail = await findElement(page, LOGIN_MAIL, SPA_ELEMENT_TIMEOUT);
    if (mail === null) {
        console.log(`${label}_ログインフォームが見つかりません`);
        await logPageState(page, `${label}_ログイン画面`);
        return false;
    }

    try {
        await mail.fill(email);
        await page.fill(LOGIN_PASS, password);
        await page.click(LOGIN_SUBMIT);
    } catch (err) {
        console.log(`${label}_ログイン情報の入力に失敗しました: ${String(err)}`);
        await logPageState(page, `${label}_ログイン入力`);
        return false;
    }

    // ⚠️⚠️ ここが本来の待ち。アカウント一覧が出るまで待つ
    try {
        await page
            .locator(".line-account-name")
            .first()
            .waitFor({ state: "visible", timeout: SPA_ELEMENT_TIMEOUT });
        console.log(`${label}_ログイン完了`);
        return true;
    } catch {
        // 出なかった。原因を掴んでから false を返す
    }

    // ⚠️ ログインに失敗するとスナックバーにメッセージが出る。
    //   これを拾えば「認証情報が違う」のか「画面が変わった」のかが分かる。
    const snack = await page
        .locator(".v-snack__content")
        .first()
        .innerText()
        .catch(() => "");
    const stillLogin = (await page.locator(LOGIN_PASS).count()) > 0;

    console.log(
        `${label}_ログインできませんでした。url=${page.url()} ` +
        `ログイン画面のまま=${stillLogin ? "はい" : "いいえ"} ` +
        `通知=${snack.trim() === "" ? "(なし)" : snack.trim()}`
    );
    if (stillLogin) {
        console.log(
            `${label}_⚠️ 認証情報（環境変数）が正しいか確認してください。` +
            `入力欄には値が入っており、送信も行えています`
        );
    }
    await logPageState(page, `${label}_ログイン失敗`);
    return false;
};

/**
 * アカウント選択画面で目的のアカウントの「管理画面を開く」を押す。
 *
 * ⚠️ 押せたら true。押せなければ false を返して画面の状態を保存する（例外は投げない）。
 *   1ブランドの失敗で他のブランドの取り込みを止めないため。
 *
 * @param legacyXPath 旧来の絶対位置セレクタ。名前で見つからないときの保険。
 *   ⚠️ 名前が変わった場合に備えて残している。将来消してよい。
 */
export const openAllgritAccount = async (
    page: Page,
    accountName: string,
    legacyXPath: string,
    label: string
): Promise<boolean> => {
    // ⚠️ `waitUntil: "load"` では足りない。SPA なのでアカウント一覧の取得は
    //   load の後に走る。networkidle まで待つ。
    await page
        .goto(BUILDER_TOP, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT })
        .catch(err => console.error(`${label}_アカウント選択画面への遷移に失敗しました:`, err));

    for (let attempt = 1; attempt <= 3; attempt++) {
        if (attempt > 1) {
            console.log(`${label}_${attempt}回目の試行のため再読み込みします`);
            await page
                .reload({ waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT })
                .catch(err => console.error(`${label}_再読み込みに失敗しました:`, err));
        }
        // ⚠️ networkidle の後もフレームワークの描画が残る。短い固定待ちを入れる
        await page.waitForTimeout(1500);

        const button = await findAccountButton(page, accountName, legacyXPath, label);
        if (button !== null) {
            await button.click();
            // ⚠️ 遷移先も SPA。次の操作まで描画を待つ
            await page.waitForLoadState("networkidle").catch(() => undefined);
            return true;
        }
        console.log(`${label}_${attempt}/3回目はアカウントのカードが見つかりませんでした`);
    }

    console.log(`${label}_アカウント「${accountName}」のカードが見つからないためスキップしました`);

    // ⚠️⚠️ **この画面に実際に並んでいるアカウント名を出す。**
    //   注文と建売を1つのログインに統合したため、
    //   「そのアカウントに権限が無い」のか「名前が変わった」のかを
    //   即座に切り分けられる必要がある。
    //   ⚠️ 権限が無い場合は環境変数（ALLGRIT_ID / ALLGRIT_PASS）を疑うこと。
    const available = await page
        .locator(".line-account-name")
        .allInnerTexts()
        .catch(() => [] as string[]);
    const names = available.map(t => t.trim()).filter(t => t !== "");
    console.log(
        `${label}_この認証情報で見えているアカウント(${names.length}件)=[${names.join(" / ")}]`
    );
    if (names.length > 0) {
        console.log(
            `${label}_⚠️ 一覧に「${accountName}」が無い場合、` +
            `この認証情報にそのアカウントの権限がありません（ALLGRIT_ID / ALLGRIT_PASS を確認）`
        );
    }

    // ⚠️ HTML とスクリーンショットが一時ディレクトリに残る。
    //   カードが無いのか、名前が変わったのかを実物で確認すること
    await logPageState(page, `${label}_アカウント選択`);
    return false;
};

/** カードを名前で引く。見つからなければ旧セレクタを試す */
const findAccountButton = async (
    page: Page,
    accountName: string,
    legacyXPath: string,
    label: string
): Promise<Locator | null> => {
    // ⚠️ カードは `.v-card` で、中に `.line-account-name`（アカウント名）と
    //   「管理画面を開く」ボタンを持つ。名前で該当カードを絞ってから
    //   そのカードの中のボタンを押す。
    //   ⚠️ ボタンだけを文言で引くと、どのアカウントのものか分からない。
    const card = page.locator(".v-card").filter({
        has: page.locator(".line-account-name", { hasText: exactText(accountName) })
    });

    const byName = card.locator("button", { hasText: "管理画面を開く" }).first();
    try {
        await byName.waitFor({ state: "visible", timeout: SPA_ELEMENT_TIMEOUT });
        return byName;
    } catch {
        // 名前で引けなかった。旧来の絶対位置セレクタを試す
    }

    const byXPath = await findElement(page, legacyXPath, 5000);
    if (byXPath !== null) {
        console.log(
            `${label}_アカウント名「${accountName}」では見つからず、旧セレクタで検出しました。` +
            `⚠️ ALLGRIT 側でアカウント名が変わった可能性があります（utils/allgritPage.ts の ALLGRIT_ACCOUNT）`
        );
    }
    return byXPath;
};

/**
 * お客様一覧を開く。
 *
 * ⚠️⚠️ **左メニューを辿らない。URL で直接遷移する。**
 *   理由は BUILDER_CUSTOMERS のコメントを参照
 *   （`.side-menu` が display:none で、クリックできず誤爆していた）。
 *
 * ⚠️ 引数の legacy* は使っていないが、呼び出し側の変更を最小にするため
 *   受け取るだけ残している。次に触るときに消してよい。
 *
 * @returns 一覧に到達できたら true
 */
export const openAllgritCustomerList = async (
    page: Page,
    _legacyMenuXPath: string,
    _legacyListXPath: string,
    label: string
): Promise<boolean> => {
    await page
        .goto(BUILDER_CUSTOMERS, { waitUntil: "networkidle", timeout: NAVIGATION_TIMEOUT })
        .catch(err => console.error(`${label}_お客様一覧への遷移に失敗しました:`, err));

    // ⚠️ 遷移できたかを URL で確かめる。未認証だと /builder/login へ、
    //   アカウント未選択だと /builder/ へ飛ばされることがある。
    //   そのまま進むと「0件」に見えて取り込みを飛ばしてしまう。
    const url = page.url();
    if (!url.includes("/builder/customers")) {
        console.log(`${label}_お客様一覧へ遷移できませんでした（url=${url}）`);
        await logPageState(page, `${label}_お客様一覧`);
        return false;
    }

    console.log(`${label}_お客様一覧を開きました`);
    return true;
};

/**
 * アカウント選択画面へ戻る（ヘッダー左上のロゴ）。
 *
 * ⚠️ 次のブランドは `goto` でトップから始めるため、ここでの復帰は
 *   失敗しても無視してよい。
 *
 * ⚠️⚠️ ブランド別ページには `id="app"` の要素が**2つ**ある
 *   （`v-application` が入れ子）。`#app > ...` のセレクタはどちらに
 *   当たるか不確かなので、`header` から辿る。
 */
export const backToAllgritTop = async (page: Page, label: string): Promise<void> => {
    await page
        .locator("header button.px-0")
        .first()
        .click({ force: true, timeout: 10000 })
        .catch(() => console.log(`${label}_アカウント切替の解除に失敗しましたが処理を続行します`));
};

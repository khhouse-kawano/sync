import { chromium, Browser, Page } from "playwright";
import { readFile } from "fs/promises";
import { notFoundShopFor, portalShopList } from "../utils/portalShopList";
import { formatDate, mapColumns, parseCsv, portalTmpPath } from "../utils/portalCsv";
import { postGateway, GatewayRow } from "../utils/postGateway";
import { closeBrowser, downloadCsvFile, NAVIGATION_TIMEOUT } from "../utils/portalPage";
import {
    ALLGRIT_ACCOUNT,
    backToAllgritTop,
    loginToAllgrit,
    openAllgritAccount,
    openAllgritCustomerList
} from "../utils/allgritPage";
import { sendErrorMail } from "./sendErrorMail";

/** ブランドごとの選択ボタン XPath（ログイン後のアカウント切り替え） */
type AllgritBrand = {
    /** ALLGRIT のアカウント選択画面に出るアカウント名。これで該当カードを引く */
    account: string;
    /**
     * 旧来の絶対位置セレクタ。
     * ⚠️ アカウント名で引けなかったときの保険としてのみ使う。
     *   将来 ALLGRIT の DOM が安定したら消してよい。
     */
    selector: string;
    /** Dashboard 側のブランド表記（portalShopList の brand と一致させる） */
    name: string;
};

const columnMapping: Record<string, string> = {
    お客様LINEUID: "id_allGrit",
    LINE登録日: "date_allGrit",
    リードステータス: "status_allGrit",
    姓: "sei_allGrit",
    名: "mei_allGrit",
    フリガナ: "kana_allGrit",
    連絡先メールアドレス: "mail_allGrit",
    電話番号: "phone_allGrit",
    郵便番号: "zip_allGrit",
    住所: "address1_allGrit",
    予算: "budget_allGrit",
    希望エリアの都道府県: "pref_allGrit",
    希望エリアの市区町村第1希望: "city_allGrit",
    希望エリアの市区町村第2希望: "city_allGrit2",
    希望エリアの市区町村第3希望: "city_allGrit3",
    // ⚠️⚠️ 以前ここは "place_homes"（Homes 用のキー名）だった。
    //   allGrit_db に place_homes 列は無く、allgrit_db_order.php の
    //   許可カラムにも無いため、建築予定地は黙って捨てられていた。
    //   列の追加: backend/scripts/sql/2026-09-08_allgrit_place.sql
    "建築予定地（市区町村）": "place_allGrit",
    来店予約: "reservation"
};

/**
 * 移植元 reloadAllgrit.js の取り込み条件。
 * 来店予約あり・資料郵送後・アンケート回答後のいずれかで、かつ姓が入力済みのものを対象とする。
 */
const isTargetRecord = (record: Record<string, string>): boolean => {
    const status = record["status_allGrit"] ?? "";
    const sei = record["sei_allGrit"] ?? "";
    const mei = record["mei_allGrit"] ?? "";

    const statusMatched =
        record["reservation"] === "1" ||
        status === "資料郵送後" ||
        status.includes("アンケート回答後");

    return (
        statusMatched &&
        sei !== "" &&
        (!sei.includes("テスト") || !mei.includes("テスト"))
    );
};

/**
 * 店舗判定。**建築予定地 → 希望エリア第1希望 → 住所** の順に見る。
 *
 * ⚠️⚠️ 2026-09-08 に建築予定地を第1優先に変更した。
 *   それまでは「希望エリア第1希望 → 住所」で、建築予定地を見ていなかった
 *   （そもそも保存されていなかった。マッピングのキー名が Homes 用だったため）。
 *
 *   他のポータルはいずれも建設予定地を第1優先にしている。
 *     Homes        place_homes            → address_homes
 *     SUUMO        place_suumo            → address3_suumo
 *     タウンライフ  place_detail_townlife → city_townlife
 *   ALLGRIT だけ揃っていなかった。
 *
 * ⚠️ 順序の意味
 *   建築予定地   … 建てる場所。店舗の担当エリアはこれで決まる
 *   希望エリア   … お客様の希望。建築予定地が未定のときの代替
 *   住所         … 現住所。最後の手段。⚠️ 現住所と建築地が別県のことがあり、
 *                  これで判定すると引っ越し先ではなく今の家の近くの店舗になる
 *
 * ⚠️ 希望エリアの第2・第3希望（city_allGrit2 / city_allGrit3）は使わない。
 *   第1希望で当たらないときに第2希望で拾うと、
 *   お客様の優先順位と担当店舗がずれる。
 */
const resolveShop = (record: Record<string, string>, brand: string): string => {
    // ⚠️ 空・未入力の項目は飛ばす。順に見ていることを読んで分かるようにするため。
    //   （`"".includes(area)` は area が非空なら false なので、
    //     飛ばさなくても結果は同じ）
    //
    // ⚠️⚠️ 逆に portalShopList の `area` に空文字が混じると危険。
    //   `text.includes("")` は常に true になり、そのブランドの反響が
    //   全件リスト先頭の店舗に寄る。area を追加するときは空でないことを確認する。
    const candidates = [
        record["place_allGrit"],
        record["city_allGrit"],
        record["address1_allGrit"]
    ];

    for (const text of candidates) {
        if (!text) continue;
        const matched = portalShopList.find(
            shop => shop.brand === brand && text.includes(shop.area)
        );
        if (matched) return matched.shop;
    }

    return notFoundShopFor(brand);
};

export const runAllgritOrder = async (): Promise<void> => {
    console.log("ALLGRIT（注文）スタート");

    const errors: string[] = [];

    const brands: AllgritBrand[] = [
        {
            account: ALLGRIT_ACCOUNT.KH,
            // ⚠️ アカウント選択画面の1枚目のカード（並び順に依存する旧セレクタ）
            selector:
                "//html/body/div[2]/div/div/div/main/div/div/div/div/div/div[2]/div[1]/div[3]/button/span",
            name: "KH"
        },
        {
            account: ALLGRIT_ACCOUNT.DJH,
            // ⚠️ 3枚目のカード。2枚目は「国分ハウジンググループ イベント情報」で未使用
            selector:
                "//html/body/div[2]/div/div/div/main/div/div/div/div/div/div[2]/div[3]/div[3]/button/span",
            name: "DJH"
        }
    ];

    const id = process.env.ALLGRIT_ORDER_ID ?? "";
    const pass = process.env.ALLGRIT_ORDER_PASS ?? "";

    /**
     * ⚠️⚠️ 以前はここで絶対位置の XPath で入力し、クリック後に
     *   `waitForLoadState("load")` を呼んで「ログイン完了」と表示していた。
     *   ALLGRIT は SPA なので load は即座に解決し、**認証が終わる前に**
     *   次の処理へ進んでいた。その結果 /builder/ が /builder/login へ
     *   戻され「ログイン画面で止まる」症状になっていた。
     *   待ち方と成功判定は utils/allgritPage.ts の loginToAllgrit に集約した。
     */
    const loginEvent = async (page: Page): Promise<boolean> => {
        page.setDefaultTimeout(NAVIGATION_TIMEOUT);
        return loginToAllgrit(page, id, pass, "ALLGRIT");
    };

    const downloadCsv = async (page: Page, brand: AllgritBrand): Promise<GatewayRow[]> => {
        page.setDefaultTimeout(NAVIGATION_TIMEOUT);
        console.log(`${brand.name}_スタート`);

        // ⚠️ 前ブランドの失敗を引きずらないよう、毎回アカウント選択画面から始める。
        //   遷移・待機・再試行・診断の保存は openAllgritAccount がまとめて行う。
        const opened = await openAllgritAccount(
            page,
            brand.account,
            brand.selector,
            brand.name
        );
        if (!opened) return [];

        // ⚠️ 左メニューは絶対位置セレクタが壊れやすいため、文言で引く。
        //   引けなかった場合のみ旧セレクタに戻す（第2・第3引数）。
        const reached = await openAllgritCustomerList(
            page,
            "//html/body/div[2]/div/div/div/div[1]/nav/div[1]/div/div/div[1]/div",
            "//html/body/div[2]/div/div/div/div[1]/div/div/a[2]",
            brand.name
        );
        if (!reached) return [];

        await page.waitForLoadState("load");

        const filePath = await downloadCsvFile(page, {
            selector:
                "//html/body/div[2]/div/div/div/main/div/div/div/div[1]/div/div[3]/div[4]/button[4]/span",
            filePath: portalTmpPath(`${brand.name}_${formatDate(new Date())}ALLGRIT.csv`),
            label: `${brand.name}_オールグリット`,
            // ⚠️⚠️ ALLGRIT はボタンを押してから実際にダウンロードが始まるまで
            //   ラグがある（サーバー側で CSV を生成してから配信している）。
            //   既定の180秒では足りない場合があるため5分まで待つ。
            //   ⚠️ 短くすると「押したのに始まらない」で毎回失敗する。
            downloadTimeout: 300000,
            // ⚠️ 顧客一覧も XHR で描画される。行が出るまで待ってから0件判定する
            listTimeout: 60000
        });
        if (filePath === null) return [];

        const records = parseCsv(await readFile(filePath, "utf8")).map(row =>
            mapColumns(row, columnMapping)
        );

        const rows = records.filter(isTargetRecord).map(record => {
            // 移植元は LINE 登録日を「取り込んだ当日」で上書きしている
            if (record["date_allGrit"]) {
                const now = new Date();
                record["date_allGrit"] = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
            }
            record["shop_allGrit"] = brand.name;
            record["shop"] = resolveShop(record, brand.name);
            return record as GatewayRow;
        });

        // 次のブランドは goto でトップから始めるため、ここでの復帰は失敗しても無視してよい
        await backToAllgritTop(page, brand.name);

        return rows;
    };

    let browser: Browser | undefined;
    const rows: GatewayRow[] = [];

    if (!id || !pass) {
        const msg = "ALLGRIT_認証情報（ALLGRIT_ORDER_ID / ALLGRIT_ORDER_PASS）が未設定です";
        errors.push(msg);
        console.log(msg);
        await sendErrorMail(errors, "runAllgritOrder.ts");
        return;
    }

    try {
        browser = await chromium.launch({ args: ["--no-sandbox"], headless: true });
        // ⚠️⚠️ ビューポートを明示する。既定は 1280x720 で、
        //   Vuetify のアカウント一覧が折り返して絶対位置のセレクタがずれる。
        //   実際にブラウザで確認したときの見え方（広い画面）に合わせる。
        const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
        const page = await context.newPage();

        // ⚠️ ログインできていないのにブランドごとの処理へ進むと、
        //   全ブランドが「アカウントのカードが見つからない」で失敗し、
        //   本当の原因（ログイン）が埋もれる。ここで止める。
        if (!await loginEvent(page)) {
            const msg = "ALLGRIT_ログインに失敗したため処理を中止しました";
            errors.push(msg);
            console.log(msg);
            await sendErrorMail(errors, "runAllgritOrder.ts");
            await closeBrowser(browser);
            return;
        }

        for (const brand of brands) {
            try {
                rows.push(...await downloadCsv(page, brand));
            } catch (err) {
                const msg = `${brand.name}_オールグリット_ダウンロード失敗:${err}`;
                errors.push(msg);
                console.log(msg);
            }
        }
    } catch (err) {
        const msg = `ALLGRIT_処理に失敗:${err}`;
        errors.push(msg);
        console.error(msg);
    } finally {
        await closeBrowser(browser);
    }

    if (rows.length > 0) {
        const result = await postGateway("allgrit_db_order", rows);
        errors.push(...result.errors.map(e => `ALLGRIT_送信失敗: ${e}`));
    }

    await sendErrorMail(errors, "runAllgritOrder.ts");
};

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllGrit = void 0;
const playwright_1 = require("playwright");
const promises_1 = require("fs/promises");
const axios_1 = __importDefault(require("axios"));
const sync_1 = require("csv-parse/sync");
const portalShopList_1 = require("../utils/portalShopList");
const portalCsv_1 = require("../utils/portalCsv");
const postGateway_1 = require("../utils/postGateway");
const portalPage_1 = require("../utils/portalPage");
const allgritPage_1 = require("../utils/allgritPage");
const sendErrorMail_1 = require("./sendErrorMail");
/**
 * ⚠️ selector の div[n] はアカウント選択画面のカードの並び（2026-09-08 時点）。
 *   1枚目 国分ハウジンググループ / 2枚目 イベント情報（未使用）
 *   3枚目 デイジャストハウス / 4枚目 かえるホーム公式
 *   ⚠️ アカウントが増減すると番号がずれる。名前で引くのが本筋で、これは保険。
 */
const TARGETS = [
    {
        account: allgritPage_1.ALLGRIT_ACCOUNT.KH,
        selector: "//html/body/div[2]/div/div/div/main/div/div/div/div/div/div[2]/div[1]/div[3]/button",
        name: "KH",
        business: "order"
    },
    {
        account: allgritPage_1.ALLGRIT_ACCOUNT.DJH,
        selector: "//html/body/div[2]/div/div/div/main/div/div/div/div/div/div[2]/div[3]/div[3]/button",
        name: "DJH",
        business: "order"
    },
    {
        account: allgritPage_1.ALLGRIT_ACCOUNT.KAERU,
        selector: "xpath=/html/body/div[2]/div/div/div/main/div/div/div/div/div/div[2]/div[4]/div[3]/button",
        name: "かえる",
        business: "kaeru"
    }
];
/** 左メニュー経由の旧セレクタ。⚠️ 現在は URL 直接遷移なので使われない（引数の互換用） */
const LEGACY_MENU_XPATH = "//html/body/div[2]/div/div/div/div[1]/nav/div[1]/div/div/div[1]/div";
const LEGACY_LIST_XPATH = "//html/body/div[2]/div/div/div/div[1]/div/div/a[2]";
/** ダウンロードボタン。⚠️ span を指しているが、無効判定は button まで遡って行う */
const DOWNLOAD_SELECTOR = "//html/body/div[2]/div/div/div/main/div/div/div/div[1]/div/div[3]/div[4]/button[4]/span";
/**
 * ダウンロードボタンを押すと開く小さなモーダルの、押すべき項目（2026-10-09 追加）。
 *
 * ⚠️ ALLGRIT のページ改修で、
 *     以前: DOWNLOAD_SELECTOR を押す → ダウンロード
 *     現在: DOWNLOAD_SELECTOR を押す → モーダルが開く → この項目を押す → ダウンロード
 *   に変わった。
 * ⚠️ 絶対位置の XPath（利用者から共有されたもの）。⚠️ モーダルの作りが変わると外れる。
 *   外れたときは「確認モーダルが開きませんでした」のログと画面の保存（logPageState）が出る。
 */
const DOWNLOAD_CONFIRM_SELECTOR = "/html/body/div[2]/div/div/div[2]/div/div[2]/div";
/**
 * ⚠️⚠️ ALLGRIT はボタンを押してから実際にダウンロードが始まるまでラグがある
 *   （サーバー側で CSV を生成してから配信している）。既定の180秒では足りない。
 */
const DOWNLOAD_TIMEOUT = 300000;
/** ⚠️ 顧客一覧も XHR で描画される。行が出るまで待ってから0件判定する */
const LIST_TIMEOUT = 60000;
// ---------------------------------------------------------------------------
// 注文（order）の列対応と絞り込み
// ---------------------------------------------------------------------------
const ORDER_COLUMNS = {
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
    //   allGrit_db に place_homes 列が無く、allgrit_db_order.php の許可カラムにも
    //   無いため、建築予定地は黙って捨てられていた。
    //   列の追加: backend/scripts/sql/2026-09-08_allgrit_place.sql
    "建築予定地（市区町村）": "place_allGrit",
    来店予約: "reservation"
};
/**
 * 注文の取り込み条件。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **移植元 portal-app/reloadAllgrit.js（115行目付近）と
 *   1文字も変えてはいけない。** 取り込む反響の母数が変わる。
 *
 *   原本:
 *     (record.reservation === "1" ||
 *       record.status_allGrit === "資料郵送後" ||
 *       record.status_allGrit.includes("アンケート回答後")) &&
 *     record.sei_allGrit !== "" &&
 *     (!record.sei_allGrit.includes("テスト") ||
 *       !record.mei_allGrit.includes("テスト"))
 *
 * ⚠️ 2026-09-08 の統合作業で、ここを一度**緩めてしまった**。
 *     reservation === "1"        → reservation !== ""        （誤）
 *     status === "資料郵送後"     → status.includes("資料郵送後")（誤）
 *   その結果、対象外の反響まで取り込まれていた。原本に戻してある。
 *
 * ⚠️ 3つの比較で「完全一致」と「部分一致」が混在しているのは**原本のまま**である。
 *     reservation … 完全一致（"1" 以外は対象外）
 *     資料郵送後   … 完全一致（「資料郵送後キャンセル」等は対象外）
 *     アンケート回答後 … 部分一致（前後に文字が付く運用がある）
 *   揃えたくなるが、揃えると件数が変わる。触らないこと。
 * ─────────────────────────────────────────────
 */
const isOrderTarget = (record) => {
    const status = record["status_allGrit"] ?? "";
    const sei = record["sei_allGrit"] ?? "";
    const mei = record["mei_allGrit"] ?? "";
    const statusMatched = 
    // ⚠️ 完全一致。"1" 以外（"0" や空）は対象外
    record["reservation"] === "1" ||
        // ⚠️ 完全一致。includes にしないこと
        status === "資料郵送後" ||
        // ⚠️ ここだけ部分一致。原本のまま
        status.includes("アンケート回答後");
    return (statusMatched &&
        sei !== "" &&
        // ⚠️ 移植元のまま。姓と名の**両方**が「テスト」のときだけ除外する
        //   （|| ではなく !a || !b）。片方だけなら通す。
        (!sei.includes("テスト") || !mei.includes("テスト")));
};
/**
 * 店舗判定。**建築予定地 → 希望エリア第1希望 → 住所** の順に見る。
 *
 * ⚠️ 順序の意味
 *   建築予定地 … 建てる場所。店舗の担当エリアはこれで決まる
 *   希望エリア … お客様の希望。建築予定地が未定のときの代替
 *   住所       … 現住所。最後の手段。⚠️ 現住所と建築地が別県のことがあり、
 *                これで判定すると引っ越し先ではなく今の家の近くの店舗になる
 *
 * ⚠️ 希望エリアの第2・第3希望は使わない。
 *   第1希望で当たらないときに第2希望で拾うと、
 *   お客様の優先順位と担当店舗がずれる。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **ここは移植元 portal-app/reloadAllgrit.js と意図的に違う。**
 *   `isOrderTarget` のように原本へ揃えてはいけない（2026-09-09 に判断済み）。
 *
 *   原本は **希望エリア第1希望 → 住所** の2段だけで、建築予定地は見ていない。
 *   正確には、原本は CSV の「建築予定地（市区町村）」を `place_homes`
 *   （Homes 用のキー名）にマップしたあと**どこからも参照しておらず**、
 *   allGrit_db にも allgrit_db_order.php の許可カラムにも place_homes が
 *   無いため、建築予定地は黙って捨てられていた。
 *   つまり原本の2段構成は設計ではなく、キー名の間違いの結果である。
 *
 *   建てる場所で担当店舗が決まるという実務に合わせ、
 *   列を追加（backend/scripts/sql/2026-09-08_allgrit_place.sql）した上で
 *   建築予定地を最優先にしている。
 *
 * ⚠️ そのため、同じ反響でも原本と担当店舗が変わることがある。
 *   （建築予定地と希望エリアが違う市区町村のとき）
 *   件数は変わらず、割り振り先だけが変わる。
 * ─────────────────────────────────────────────
 */
const resolveShop = (record, brand) => {
    // ⚠️ 空・未入力の項目は飛ばす。順に見ていることを読んで分かるようにするため。
    //
    // ⚠️⚠️ portalShopList の `area` に空文字が混じると危険。
    //   `text.includes("")` は常に true になり、そのブランドの反響が
    //   全件リスト先頭の店舗に寄る。area を追加するときは空でないことを確認する。
    const candidates = [
        record["place_allGrit"],
        record["city_allGrit"],
        record["address1_allGrit"]
    ];
    for (const text of candidates) {
        if (!text)
            continue;
        const matched = portalShopList_1.portalShopList.find(shop => shop.brand === brand && text.includes(shop.area));
        if (matched)
            return matched.shop;
    }
    return (0, portalShopList_1.notFoundShopFor)(brand);
};
// ---------------------------------------------------------------------------
// 建売（kaeru）の列対応と絞り込み
// ---------------------------------------------------------------------------
const KAERU_COLUMNS = {
    "お客様ID": "customer_id",
    "お客様LINEUID": "line_uid",
    "LINE登録日": "line_registered_at",
    "種別": "customer_type",
    "会社名": "company_name",
    "リードステータス": "lead_status",
    "引き渡し日": "delivery_date",
    "LINE表示名": "line_display_name",
    "姓": "last_name",
    "名": "first_name",
    "フリガナ": "name_kana",
    "生年月日": "birth_date",
    "性別": "gender",
    "連絡先メールアドレス": "email",
    "電話番号": "phone",
    "郵便番号": "zip_code",
    "住所": "address",
    "予算": "budget",
    "電話可能な時間帯": "available_time",
    "土地探しの状況": "land_search_status",
    "動機": "motivation",
    "希望エリアの都道府県": "desired_pref",
    "希望エリアの市区町村第1希望": "desired_city_1",
    "希望エリアの市区町村第2希望": "desired_city_2",
    "希望エリアの市区町村第3希望": "desired_city_3",
    "資料請求状況": "document_request_status",
    "その他の条件": "other_conditions",
    "お友達登録状況": "friend_add_status",
    "お友達登録経路": "friend_add_route",
    "担当者": "staff",
    "来店予約": "visit_reservation",
    "メッセージ受信": "message_received",
    "オーナーID": "owner_id",
    "流入元キャンペーン": "source_campaign",
    "流入元媒体": "source_media",
    "流入元サイト": "source_site",
    "GoogleClickId": "gclid",
    "タグ": "tags",
    "ご希望の都道府県": "desired_pref_alt",
    "希望エリア（学校区など詳細をご記入ください）": "desired_area_detail",
    "希望エリア【第1】": "desired_area_1",
    "希望エリア【第2】": "desired_area_2",
    "希望エリア【第3】": "desired_area_3"
};
/**
 * 建売の1行を変換する。
 *
 * ⚠️ `remarks` に**CSVの全項目**を「見出し：値」で連結して入れる。
 *   KAERU_COLUMNS に無い項目も含める。ALLGRIT はアンケート項目が
 *   随時増えるため、対応表に無い回答を取りこぼさないための保険である。
 *   ⚠️ 行が大きくなるが、消さないこと。
 */
const mapKaeruRecord = (jpRecord) => {
    const obj = {};
    const remarksList = [];
    for (const [jpKeyRaw, valRaw] of Object.entries(jpRecord)) {
        // ⚠️ CSVの見出しに引用符が残ることがあるので落とす
        const jpKey = String(jpKeyRaw).trim().replace(/^"|"$/g, "");
        const cell = valRaw === undefined || valRaw === null ? "" : String(valRaw).trim();
        if (jpKey) {
            remarksList.push(`${jpKey}：${cell}`);
        }
        const mapped = KAERU_COLUMNS[jpKey];
        if (!mapped)
            continue;
        obj[mapped] = cell;
    }
    obj["remarks"] = remarksList.join("\n");
    return obj;
};
/** 建売の取り込み条件。⚠️ 注文とは条件が違う（テスト客の除外は姓名どちらかで効く） */
const isKaeruTarget = (rec) => {
    const isReserved = rec.visit_reservation === "1";
    const status = String(rec.lead_status || "");
    const isTargetStatus = status === "資料郵送後" || status.includes("アンケート回答後");
    const lastName = String(rec.last_name || "");
    const firstName = String(rec.first_name || "");
    const isTestUser = lastName.includes("テスト") || firstName.includes("テスト");
    return (isReserved || isTargetStatus) && lastName !== "" && !isTestUser;
};
/** 建売の送信先。⚠️ 注文の postGateway とは request 名も形も違う */
const KAERU_POST_URL = "https://khg-marketing.info/dashboard/api/gateway/";
/** ⚠️ 1回で全件送ると ① の PHP がメモリ上限を超えるため分割する */
const KAERU_CHUNK_SIZE = 500;
const postKaeruChunk = async (chunk, retries = 2, delayMs = 1000) => {
    const payload = { request: "allGrit_kaeru", data: chunk };
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await axios_1.default.post(KAERU_POST_URL, payload, {
                headers: { "Content-Type": "application/json" },
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
};
// ---------------------------------------------------------------------------
// 本体
// ---------------------------------------------------------------------------
/**
 * @param id ALLGRIT_ID
 * @param pass ALLGRIT_PASS
 */
const runAllGrit = async (id, pass) => {
    console.log("ALLGRIT スタート");
    // ⚠️ 実行ごとに初期化する。モジュールスコープだと前回のエラーが次回に持ち越される
    const errors = [];
    if (!id || !pass) {
        const msg = "ALLGRIT_認証情報（ALLGRIT_ID / ALLGRIT_PASS）が未設定です";
        errors.push(msg);
        console.log(msg);
        await (0, sendErrorMail_1.sendErrorMail)(errors, "runAllGrit.ts");
        return;
    }
    /** 注文の送信待ち。⚠️ 3アカウント分をまとめて1回で送る（移植元と同じ） */
    const orderRows = [];
    let browser;
    /** 1アカウント分のCSVを落として保存先を返す。取れなければ null */
    const downloadFor = async (page, target) => {
        console.log(`${target.name}_スタート`);
        // ⚠️ 前のアカウントの状態を引きずらないよう、毎回アカウント選択画面から始める。
        //   遷移・待機・再試行・診断の保存は openAllgritAccount がまとめて行う。
        if (!await (0, allgritPage_1.openAllgritAccount)(page, target.account, target.selector, target.name)) {
            return null;
        }
        // ⚠️ 左メニューは display:none で押せないため、URL で直接開く
        if (!await (0, allgritPage_1.openAllgritCustomerList)(page, LEGACY_MENU_XPATH, LEGACY_LIST_XPATH, target.name)) {
            return null;
        }
        return (0, portalPage_1.downloadCsvFile)(page, {
            selector: DOWNLOAD_SELECTOR,
            filePath: (0, portalCsv_1.portalTmpPath)(`${target.name}_${(0, portalCsv_1.formatDate)(new Date())}ALLGRIT_${target.business}.csv`),
            label: `${target.name}_オールグリット`,
            downloadTimeout: DOWNLOAD_TIMEOUT,
            listTimeout: LIST_TIMEOUT,
            // ⚠️ 2026-10-09: ボタンのあとに確認モーダルの項目を押す（ページ改修への対応）
            confirmSelector: DOWNLOAD_CONFIRM_SELECTOR
        });
    };
    /** 注文のCSVを解釈して送信待ちに積む */
    const collectOrder = async (filePath, target) => {
        const records = (0, portalCsv_1.parseCsv)(await (0, promises_1.readFile)(filePath, "utf8")).map(row => (0, portalCsv_1.mapColumns)(row, ORDER_COLUMNS));
        const rows = records.filter(isOrderTarget).map(record => {
            // ⚠️ 移植元は LINE 登録日を「取り込んだ当日」で上書きしている
            if (record["date_allGrit"]) {
                const now = new Date();
                record["date_allGrit"] = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
            }
            record["shop_allGrit"] = target.name;
            record["shop"] = resolveShop(record, target.name);
            return record;
        });
        console.log(`${target.name}_対象 ${rows.length}件 / CSV ${records.length}件`);
        orderRows.push(...rows);
    };
    /** 建売のCSVを解釈してその場で送信する */
    const sendKaeru = async (filePath, target) => {
        const text = (await (0, promises_1.readFile)(filePath)).toString("utf8");
        const jpRecords = (0, sync_1.parse)(text, {
            bom: true,
            columns: true,
            skip_empty_lines: true,
            relax_column_count: true,
            trim: true
        });
        const mapped = jpRecords.map(mapKaeruRecord).filter(isKaeruTarget);
        // ⚠️ 登録日は「YYYY-MM-DD HH:MM」で来る。日付だけにする
        for (const record of mapped) {
            if (typeof record.line_registered_at === "string" && record.line_registered_at) {
                record.line_registered_at = record.line_registered_at.split(" ")[0];
            }
        }
        console.log(`${target.name}_対象 ${mapped.length}件 / CSV ${jpRecords.length}件`);
        let success = 0;
        let failed = 0;
        for (let i = 0; i < mapped.length; i += KAERU_CHUNK_SIZE) {
            const chunk = mapped.slice(i, i + KAERU_CHUNK_SIZE);
            const chunkNumber = Math.floor(i / KAERU_CHUNK_SIZE) + 1;
            try {
                console.log(`${target.name}_${chunkNumber}件目のかたまり（${chunk.length}件）を送信します`);
                await postKaeruChunk(chunk);
                success++;
            }
            catch (err) {
                failed++;
                // ⚠️ ① が返すエラー本文まで出す。DBのどの列で落ちたかが分かる
                const detail = err.response?.data !== undefined
                    ? JSON.stringify(err.response.data)
                    : "";
                const msg = `${target.name}_送信失敗（${chunkNumber}件目）: ${err instanceof Error ? err.message : String(err)}`;
                console.error(msg);
                if (detail)
                    console.error(`  ① からのエラー詳細: ${detail}`);
                errors.push(detail ? `${msg} / ${detail}` : msg);
            }
        }
        console.log(`${target.name}_送信完了 成功 ${success} / 失敗 ${failed}`);
    };
    try {
        browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"], headless: true });
        // ⚠️⚠️ ビューポートを明示する。既定は 1280x720 で、
        //   Vuetify のアカウント一覧が折り返して絶対位置のセレクタがずれる。
        const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
        const page = await context.newPage();
        page.setDefaultTimeout(portalPage_1.NAVIGATION_TIMEOUT);
        // ⚠️ ログインできていないままアカウントごとの処理へ進むと、
        //   全アカウントが「カードが見つからない」で失敗し、
        //   本当の原因（ログイン）が埋もれる。ここで止める。
        if (!await (0, allgritPage_1.loginToAllgrit)(page, id, pass, "ALLGRIT")) {
            const msg = "ALLGRIT_ログインに失敗したため処理を中止しました";
            errors.push(msg);
            console.log(msg);
            await (0, sendErrorMail_1.sendErrorMail)(errors, "runAllGrit.ts");
            await (0, portalPage_1.closeBrowser)(browser);
            return;
        }
        for (const target of TARGETS) {
            try {
                const filePath = await downloadFor(page, target);
                if (filePath === null) {
                    // ⚠️ 0件・到達できずはスキップ扱い。理由は downloadCsvFile が出す
                    continue;
                }
                if (target.business === "order") {
                    await collectOrder(filePath, target);
                }
                else {
                    await sendKaeru(filePath, target);
                }
            }
            catch (err) {
                // ⚠️ 1アカウントの失敗で他を止めない
                const msg = `${target.name}_オールグリット_処理失敗: ${err}`;
                errors.push(msg);
                console.log(msg);
            }
            // ⚠️ 次のアカウントは goto でトップから始めるため、復帰は失敗しても無視してよい
            await (0, allgritPage_1.backToAllgritTop)(page, target.name);
        }
    }
    catch (err) {
        const msg = `ALLGRIT_処理に失敗: ${err}`;
        errors.push(msg);
        console.error(msg);
    }
    finally {
        // ⚠️ 例外が起きても Chromium を必ず終了させる。
        //   閉じ残るとメモリを圧迫し、後続タスクや次回以降の実行まで巻き込んで失敗する。
        await (0, portalPage_1.closeBrowser)(browser);
    }
    // ⚠️ 注文は3アカウント分をまとめて送る（移植元と同じ）。
    //   ブラウザを閉じた後に送るので、送信中にセッションが切れる心配がない。
    if (orderRows.length > 0) {
        const result = await (0, postGateway_1.postGateway)("allgrit_db_order", orderRows);
        errors.push(...result.errors.map(e => `ALLGRIT_注文_送信失敗: ${e}`));
        console.log(`ALLGRIT_注文 ${orderRows.length}件を送信しました`);
    }
    await (0, sendErrorMail_1.sendErrorMail)(errors, "runAllGrit.ts");
};
exports.runAllGrit = runAllGrit;

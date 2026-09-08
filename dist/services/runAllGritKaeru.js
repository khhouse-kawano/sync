"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAllGritKaeru = void 0;
const playwright_1 = require("playwright");
const promises_1 = require("fs/promises");
const sync_1 = require("csv-parse/sync");
const axios_1 = __importDefault(require("axios"));
const portalPage_1 = require("../utils/portalPage");
const portalCsv_1 = require("../utils/portalCsv");
const allgritPage_1 = require("../utils/allgritPage");
const sendErrorMail_1 = require("./sendErrorMail");
// ※shopsのインポートが必要な場合は有効化してください
// import shops from "./shops.js";
const headerMap = {
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
const runAllGritKaeru = async (allgrit_id, allgrit_pass) => {
    // 実行ごとに初期化する。モジュールスコープだと前回のエラーが次回に持ち越される。
    const errors = [];
    console.log("ALLGRITスタート");
    const browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"], headless: true });
    // ⚠️⚠️ ビューポートを明示する。既定は 1280x720 で、
    //   Vuetify のアカウント一覧が折り返して絶対位置のセレクタがずれる。
    //   ブラウザで確認したときの見え方（広い画面）に合わせる。
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    page.setDefaultTimeout(120000);
    // ★ 修正1: remarksに全データを結合して格納する処理を追加
    function mapRecord(jpRecord) {
        const obj = {};
        const remarksList = [];
        for (const [jpKeyRaw, valRaw] of Object.entries(jpRecord)) {
            const jpKey = String(jpKeyRaw).trim().replace(/^"|"$/g, '');
            const cell = valRaw === undefined || valRaw === null ? "" : String(valRaw).trim();
            if (jpKey) {
                remarksList.push(`${jpKey}：${cell}`);
            }
            const mapped = headerMap[jpKey];
            if (!mapped)
                continue;
            obj[mapped] = cell;
        }
        obj['remarks'] = remarksList.join('\n');
        return obj;
    }
    // ★ 修正2: request名をPHP側と一致するように「allgrit_kaeru」に修正
    async function postChunkWithRetry(url, chunk, retries = 2, delayMs = 1000) {
        const payload = {
            request: 'allGrit_kaeru',
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
    /**
     * ⚠️⚠️ 以前はここで絶対位置の XPath で入力し、クリック後に
     *   `waitForLoadState("load")` を呼んで「ログイン完了」と表示していた。
     *   ALLGRIT は SPA なので load は即座に解決し、**認証が終わる前に**
     *   次の処理へ進んでいた。待ち方と成功判定は
     *   utils/allgritPage.ts の loginToAllgrit に集約した。
     *
     * ⚠️ 失敗したら false を返す。呼び出し側で処理を止めること。
     *   以前は失敗しても processData() へ進んでいた。
     */
    const login = async () => {
        const ok = await (0, allgritPage_1.loginToAllgrit)(page, allgrit_id, allgrit_pass, "ALLGRIT_かえる");
        if (!ok) {
            errors.push("ログイン失敗: アカウント一覧が表示されませんでした");
        }
        return ok;
    };
    const processData = async () => {
        try {
            console.log("データダウンロード処理スタート");
            // ⚠️⚠️ 以前は絶対位置の XPath（4枚目のカード）を直接 click していた。
            //   ALLGRIT は Nuxt + Vuetify の SPA で、描画が間に合わないと
            //   「要素が無い」で例外になり、原因も分からなかった。
            //   アカウント名で引き、待機・再試行・診断の保存もヘルパーに任せる。
            const opened = await (0, allgritPage_1.openAllgritAccount)(page, allgritPage_1.ALLGRIT_ACCOUNT.KAERU, 
            // ⚠️ 旧セレクタ（4枚目のカード）は名前で引けないときの保険
            'xpath=/html/body/div[2]/div/div/div/main/div/div/div/div/div/div[2]/div[4]/div[3]/button', 'かえるホーム');
            if (!opened) {
                const msg = 'ALLGRIT_かえるホームのアカウントに切り替えられませんでした';
                console.log(msg);
                errors.push(msg);
                return;
            }
            // 左メニュー > 顧客管理 > お客様一覧
            const reached = await (0, allgritPage_1.openAllgritCustomerList)(page, "//html/body/div[2]/div/div/div/div[1]/nav/div[1]/div/div/div[1]/div", "//html/body/div[2]/div/div/div/div[1]/div/div/a[2]", 'かえるホーム');
            if (!reached) {
                const msg = 'ALLGRIT_お客様一覧に到達できませんでした';
                console.log(msg);
                errors.push(msg);
                return;
            }
            // ⚠️⚠️ ダウンロード処理は downloadCsvFile に統一した。
            //   以前はここで直接 waitForEvent("download") していたが、
            //   タイムアウトを渡していなかったため page の既定値（120秒）が
            //   使われていた。**ALLGRIT はボタンを押してから実際に
            //   ダウンロードが始まるまでラグがある**（サーバー側で CSV を
            //   生成してから配信する）ため、120秒では足りないことがある。
            //
            //   downloadCsvFile に寄せることで以下も一緒に効く。
            //     ・一覧の行が描画されるまで待ってから0件判定する
            //     ・待機中に生存ログを出す（無言で固まったように見えない）
            //     ・失敗時に画面のHTMLとスクリーンショットを残す
            const today = new Date();
            const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
            // ⚠️ 保存先を /tmp 直書きから portalTmpPath に変更した。
            //   os.tmpdir() 配下を使うため Windows でも動き、
            //   ディレクトリが無ければ自動で作られる（mkdir が不要になった）。
            const savePath = (0, portalCsv_1.portalTmpPath)(`${yyyymmdd}_ALLGRIT_kaeru.csv`);
            const downloaded = await (0, portalPage_1.downloadCsvFile)(page, {
                selector: "//html/body/div[2]/div/div/div/main/div/div/div/div[1]/div/div[3]/div[4]/button[4]/span",
                filePath: savePath,
                label: "ALLGRIT_かえる",
                // ⚠️ ラグがあるため5分まで待つ
                downloadTimeout: 300000,
                // ⚠️ 顧客一覧も XHR で描画される。行が出るまで待ってから0件判定する
                listTimeout: 60000
            });
            if (downloaded === null) {
                const msg = "ALLGRIT_かえる: CSVを取得できなかったため処理を終了します";
                console.log(msg);
                errors.push(msg);
                return;
            }
            // ファイル読み込みとパース
            const buf = await (0, promises_1.readFile)(savePath);
            const text = buf.toString("utf8");
            const jpRecords = (0, sync_1.parse)(text, {
                bom: true,
                columns: true,
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true
            });
            // マッピングとフィルタリング
            const mappedRecords = jpRecords
                .map(mapRecord)
                .filter(rec => {
                const isReserved = rec.visit_reservation === "1";
                const status = String(rec.lead_status || "");
                const isTargetStatus = status === "資料郵送後" || status.includes("アンケート回答後");
                const lastName = String(rec.last_name || "");
                const firstName = String(rec.first_name || "");
                const isTestUser = lastName.includes("テスト") || firstName.includes("テスト");
                return (isReserved || isTargetStatus) && lastName !== "" && !isTestUser;
            });
            // 登録日のフォーマット変更（「YYYY-MM-DD HH:MM」→「YYYY-MM-DD」）
            for (const record of mappedRecords) {
                if (typeof record.line_registered_at === 'string' && record.line_registered_at) {
                    record.line_registered_at = record.line_registered_at.split(' ')[0];
                }
            }
            console.log(`Parsed & filtered rows:`, mappedRecords.length);
            // バルクアップロード
            const POST_URL = 'https://khg-marketing.info/dashboard/api/gateway/'; // ★必要に応じてURL確認
            const CHUNK_SIZE = 500;
            const successes = [];
            const failures = [];
            for (let i = 0; i < mappedRecords.length; i += CHUNK_SIZE) {
                const chunk = mappedRecords.slice(i, i + CHUNK_SIZE);
                const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
                // ★ 修正3: 500エラーの詳細（DBエラーの原因）をコンソールに出力するよう強化
                try {
                    console.log(`Posting chunk ${chunkNumber} (${chunk.length} records)...`);
                    const res = await postChunkWithRetry(POST_URL, chunk, 2, 1000);
                    successes.push({ chunkIndex: chunkNumber, response: res });
                }
                catch (err) {
                    const apiErrorDetail = err.response?.data ? JSON.stringify(err.response.data) : "";
                    const errMsg = err instanceof Error ? err.message : String(err);
                    console.error(`Failed chunk ${chunkNumber}:`, errMsg);
                    if (apiErrorDetail) {
                        console.error(`★APIからのエラー詳細:`, apiErrorDetail);
                    }
                    failures.push({ chunkIndex: chunkNumber, error: errMsg, apiErrorDetail });
                }
            }
            console.log(`Upload done. success chunks:`, successes.length, 'failed chunks:', failures.length);
        }
        catch (e) {
            // ★ 万が一Playwrightがコケた場合、カレントディレクトリにスクショを残す
            const errPath = `./error_screenshot_${Date.now()}.png`;
            await page.screenshot({ path: errPath, fullPage: true }).catch(() => { });
            const msg = `ダウンロード/インポート処理に失敗:${e}\n※スクリーンショットを ${errPath} に保存しました。`;
            console.error(msg);
            errors.push(msg);
        }
    };
    try {
        // ⚠️ ログインできていないまま processData() へ進むと、
        //   「アカウントのカードが見つからない」で失敗し本当の原因が埋もれる
        if (await login()) {
            await processData();
        }
        else {
            console.log("ALLGRIT_ログインに失敗したため処理を中止しました");
        }
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
        await (0, sendErrorMail_1.sendErrorMail)(errors, 'runAllgrit.ts');
    }
};
exports.runAllGritKaeru = runAllGritKaeru;

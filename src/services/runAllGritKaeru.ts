import { chromium } from 'playwright';
import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { parse } from 'csv-parse/sync';
import axios from 'axios';
import { sendErrorMail } from "./sendErrorMail";
// ※shopsのインポートが必要な場合は有効化してください
// import shops from "./shops.js";

const errors: string[] = [];

const headerMap: Record<string, string> = {
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

export const runAllGritKaeru = async (allgrit_id: string, allgrit_pass: string) => {
    console.log("ALLGRITスタート");
    const browser = await chromium.launch({ args: ["--no-sandbox"], headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(120000);

    // ★ 修正1: remarksに全データを結合して格納する処理を追加
    function mapRecord(jpRecord: Record<string, unknown>): Record<string, unknown> {
        const obj: Record<string, unknown> = {};
        const remarksList: string[] = [];

        for (const [jpKeyRaw, valRaw] of Object.entries(jpRecord)) {
            const jpKey = String(jpKeyRaw).trim().replace(/^"|"$/g, '');
            const cell = valRaw === undefined || valRaw === null ? "" : String(valRaw).trim();

            if (jpKey) {
                remarksList.push(`${jpKey}：${cell}`);
            }

            const mapped = headerMap[jpKey];
            if (!mapped) continue;
            obj[mapped] = cell;
        }

        obj['remarks'] = remarksList.join('\n');
        return obj;
    }

    // ★ 修正2: request名をPHP側と一致するように「allgrit_kaeru」に修正
    async function postChunkWithRetry(url: string, chunk: any[], retries = 2, delayMs = 1000) {
        const payload = {
            request: 'allGrit_kaeru',
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

    const login = async () => {
        try {
            await page.goto("https://line-saas.auka.jp/builder/login");
            await page.fill("//html/body/div[2]/div/div/div/main/div/div[1]/div/div/div/div/div[3]/form/div[1]/div/div[1]/div/input", allgrit_id);
            await page.fill("//html/body/div[2]/div/div/div/main/div/div[1]/div/div/div/div/div[3]/form/div[2]/div/div[1]/div/input", allgrit_pass);
            await page.click("//html/body/div[2]/div/div/div/main/div/div[1]/div/div/div/div/div[3]/form/div[3]/button/span");
            await page.waitForLoadState("load");
            console.log("ログイン完了");
        } catch (e) {
            const msg = `ログイン失敗:${e}`;
            console.error(msg);
            errors.push(msg);
        }
    };

    const processData = async () => {
        try {
            console.log("データダウンロード処理スタート");
            await page.waitForLoadState("load");
            await page.click('xpath=/html/body/div[2]/div/div/div/main/div/div/div/div/div/div[2]/div[4]/div[3]/button');

            // 左上メニュー > お客様一覧 をクリック
            await page.click("//html/body/div[2]/div/div/div/div[1]/nav/div[1]/div/div/div[1]/div");
            await page.click("//html/body/div[2]/div/div/div/div[1]/div/div/a[2]");
            await page.waitForLoadState("load");

            // ダウンロードボタンをクリック
            const downloadPromise = page.waitForEvent("download");
            await page.waitForLoadState("load");
            await page.click("//html/body/div[2]/div/div/div/main/div/div/div/div[1]/div/div[3]/div[4]/button[4]/span");
            const download = await downloadPromise;

            if (!existsSync("/tmp")) {
                await mkdir("/tmp");
            }

            const today = new Date();
            const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
            const savePath = `/tmp/${yyyymmdd}_ALLGRIT.csv`;

            await download.saveAs(savePath);

            // ファイル読み込みとパース
            const buf = await readFile(savePath);
            const text = buf.toString("utf8");
            const jpRecords = parse(text, {
                bom: true,
                columns: true,
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true
            }) as Array<Record<string, unknown>>;

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
                } catch (err: any) {
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

        } catch (e) {
            // ★ 万が一Playwrightがコケた場合、カレントディレクトリにスクショを残す
            const errPath = `./error_screenshot_${Date.now()}.png`;
            await page.screenshot({ path: errPath, fullPage: true }).catch(() => { });

            const msg = `ダウンロード/インポート処理に失敗:${e}\n※スクリーンショットを ${errPath} に保存しました。`;
            console.error(msg);
            errors.push(msg);
        }
    };

    await login();
    await processData();

    await browser.close();
    await sendErrorMail(errors, 'runAllgrit.ts');
};
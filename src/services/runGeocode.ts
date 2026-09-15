import axios from "axios";
import { sendErrorMail } from "./sendErrorMail";

/**
 * 経緯度が入っていない顧客データを取得し、Geocoding で解決して保存する。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **2026-09-15 に作り直した。原因は請求 ¥150,000 の超過である。**
 *
 *   ⚠️ 以前はこの前に「物件データの処理」があり、**毎回 property_db の
 *     全1,031件を Geocoding に投げていた。しかも1件も保存できていなかった。**
 *     理由は3つとも噛み合っていなかったため:
 *       1. 絞り込みが `!item.latitude || !item.longitude` だったが、
 *          **property_db に latitude / longitude 列は無い**（あるのは lat_lng）。
 *          → 常に undefined → **全件が対象**になっていた。
 *       2. 送信キーが `item.property_number` だったが、
 *          **property_db のキーは property_id**。→ undefined を送っていた。
 *       3. 保存先の geoCode.php が **property_list_kaeru** を更新していた。
 *          → **そもそも別テーブル**。
 *
 *   ⚠️⚠️ さらにこの処理は**丸ごと不要だった**。property_db の経緯度は
 *     下の customer_address（SELECT の UNION に property_db が入っている）が
 *     既に取得・保存していた。**同じ物件を2系統で叩いていた。**
 *
 *   ⚠️ **戻さないこと。** 復活させると月6万件の無駄打ちが再発する。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **同じ行を二度叩かないことが最重要である。**
 *   ⚠️ 住所から座標が出なかった行には **"取得不可"** を保存する。
 *     そうすると次回の SELECT に出てこなくなる（未設定は NULL と空文字だけ）。
 *   ⚠️ 住所が空の行も、API を叩かずに "取得不可" を保存して消す。
 *     放っておくと**毎回 SELECT に出続ける**。
 *
 * ⚠️⚠️ **ただし「通信が失敗した」ときは "取得不可" を保存してはいけない。**
 *   ⚠️ キーの不正やネットワーク障害で保存すると、
 *     **正常な住所が二度と取得できなくなる**（消せない印が付く）。
 *   ⚠️ 区別は下の GeoResult の kind で行う:
 *       ok      → 座標を保存
 *       nohit   → "取得不可" を保存（住所として解決できない。次回は来ない）
 *       error   → **何も保存しない**（次回やり直す）
 *       fatal   → **実行そのものを止める**（キー不正・上限超過。全件を焦がさない）
 * ─────────────────────────────────────────────
 */

const API_KEY = process.env.API_KEY;

/**
 * ⚠️ 既定は本番。⚠️ 検証のときだけ `GATEWAY_URL` でローカルへ向ける。
 *   ⚠️ 設定しなければ今までどおり本番なので、運用の挙動は変わらない。
 */
const GATEWAY_URL = process.env.GATEWAY_URL ?? "https://khg-marketing.info/dashboard/api/gateway/";

/** ⚠️ 連続で叩くとレート制限に当たる */
const INTERVAL_MS = 200;

/**
 * ⚠️⚠️ **1回の実行で叩く上限。**
 *   ⚠️ 今回の事故は「何件叩いているか誰も見ていなかった」ことで
 *     ひと月20万件まで膨らんだ。⚠️ 上限に当たったらエラーメールで知らせる。
 *   ⚠️ 残りは次回に回るだけなので、上限を低めにしても取りこぼしにはならない。
 */
const MAX_PER_RUN = Number(process.env.GEOCODE_MAX_PER_RUN ?? 500);

/**
 * ⚠️⚠️ **通信エラーが続いたら止める。**
 *   ⚠️ 落ちているのに500件ぶん叩き続けても意味が無く、課金だけが増える。
 */
const MAX_CONSECUTIVE_ERRORS = 10;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** dashboard から受け取る1行 */
type TargetRow = {
    id: string;
    full_address: string | null;
    lat_lng: string | null;
    /** `order` / `used` / `spec` / `property`。保存先テーブルの振り分けに使う */
    category: string;
};

/**
 * Geocoding の結果。
 * ⚠️ 「見つからない」と「叩けなかった」を必ず分ける（保存の可否が逆になる）。
 */
type GeoResult =
    | { kind: "ok"; lat: number; lng: number }
    | { kind: "nohit"; status: string }
    | { kind: "error"; message: string }
    | { kind: "fatal"; message: string };

/** ⚠️ 住所として解決できないことが確定する status。これだけが "取得不可" に値する */
const NOHIT_STATUS = new Set(["ZERO_RESULTS", "INVALID_REQUEST", "NOT_FOUND"]);

/**
 * ⚠️⚠️ 実行を止めるべき status。
 *   ⚠️ REQUEST_DENIED はキーの不正、OVER_QUERY_LIMIT は上限超過。
 *     ⚠️ どちらも**全件が nohit に見えてしまう**ので、
 *       ここで止めないとデータ全体に "取得不可" を焼き付けてしまう。
 */
const FATAL_STATUS = new Set(["REQUEST_DENIED", "OVER_QUERY_LIMIT"]);

const fetchLatLng = async (address: string): Promise<GeoResult> => {
    try {
        const res = await axios.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            {
                params: { address: address.trim(), language: "ja", region: "jp", key: API_KEY },
                timeout: 30000,
            }
        );

        const status: string = res.data?.status ?? "";

        if (status === "OK" && res.data?.results?.[0]?.geometry?.location) {
            const location = res.data.results[0].geometry.location;
            return { kind: "ok", lat: location.lat, lng: location.lng };
        }
        if (FATAL_STATUS.has(status)) {
            return { kind: "fatal", message: `Geocoding が ${status} を返しました（${res.data?.error_message ?? ""}）` };
        }
        if (NOHIT_STATUS.has(status)) {
            return { kind: "nohit", status };
        }
        // ⚠️ UNKNOWN_ERROR など。⚠️ 一時的なものなので "取得不可" にはしない
        return { kind: "error", message: `Geocoding が ${status} を返しました` };
    } catch (err) {
        // ⚠️ 通信の失敗。⚠️ 住所のせいではないので "取得不可" にはしない
        return { kind: "error", message: err instanceof Error ? err.message : String(err) };
    }
};

export const RunGeoCode = async (): Promise<void> => {
    // 実行ごとに初期化する。モジュールスコープだと前回のエラーが次回に持ち越される。
    const errors: string[] = [];

    const headers = {
        Authorization: "4081Kokubu",
        "Content-Type": "application/json",
    };

    /**
     * 1行ぶん保存する。
     * ⚠️ 戻り値は「本当に更新できたか」。⚠️ 200 が返っても
     *   0行更新のことがあり、それを見逃すと**毎回同じ行を叩き続ける**。
     */
    const save = async (row: TargetRow, value: string): Promise<boolean> => {
        try {
            const res = await axios.post(
                GATEWAY_URL,
                { request: "customer_address", id: row.id, category: row.category, lat_lng: value },
                { headers, timeout: 30000 }
            );
            const body = res.data ?? {};

            if (body.error) {
                const msg = `[geocode] 保存を拒否されました id=${row.id} category=${row.category}: ${body.error}`;
                console.error(msg);
                errors.push(msg);
                return false;
            }
            /**
             * ⚠️⚠️ **更新のつもりが SELECT で返ってきていないか確かめる。**
             *   ⚠️ customer_address.php は `empty($data['id'])` で分岐しており、
             *     id が NULL や空だと**一覧を返す SELECT 側へ落ちる**。
             *   ⚠️ それでも HTTP 200 なので、mode を見ないと成功に見える。
             *   ⚠️ 2026-09-15、master_data_resale に id が NULL の行があり、
             *     これで1件が黙って取りこぼされていた。
             */
            if (body.mode !== "update") {
                const msg = `[geocode] 更新になっていません（mode=${body.mode}）id=${row.id} category=${row.category}`;
                console.error(msg);
                errors.push(msg);
                return false;
            }
            // ⚠️ updated は customer_address.php が返す更新行数。
            //   ⚠️ 0 なら id が合っていない＝次回も同じ行が来る。黙って進まない
            if (typeof body.updated === "number" && body.updated === 0) {
                const msg = `[geocode] 0行しか更新されませんでした id=${row.id} category=${row.category}`;
                console.error(msg);
                errors.push(msg);
                return false;
            }
            return true;
        } catch (err) {
            const msg = `[geocode] 保存に失敗 id=${row.id}: ${err instanceof Error ? err.message : String(err)}`;
            console.error(msg);
            errors.push(msg);
            return false;
        }
    };

    try {
        if (!API_KEY) {
            // ⚠️ ここで止める。⚠️ 続けると全件に "取得不可" が付く
            const msg = "[geocode] API_KEY が設定されていません。実行を中止します";
            console.error(msg);
            errors.push(msg);
            return;
        }

        // ---- 1. 経緯度の無い顧客データを取る ----
        // ⚠️ master_data / master_data_kaeru / master_data_resale / property_db の
        //   lat_lng が未設定の行が返る（customer_address.php の SELECT）
        let rows: TargetRow[] = [];
        try {
            const res = await axios.post(
                GATEWAY_URL, { request: "customer_address" }, { headers, timeout: 120000 });
            rows = Array.isArray(res.data?.address) ? res.data.address : [];
        } catch (err) {
            const msg = `[geocode] 対象の取得に失敗: ${err instanceof Error ? err.message : String(err)}`;
            console.error(msg);
            errors.push(msg);
            return;
        }

        /**
         * ⚠️⚠️ **id が無い行は保存できない。**
         *   ⚠️ customer_address.php は `empty($data['id'])` で SELECT 側へ落ちるため、
         *     何を送っても更新されない。⚠️ Geocoding を叩くだけ無駄なので先に外す。
         *   ⚠️ 黙って捨てるとデータの不備に気づけないので、必ず報告する。
         */
        const noId = rows.filter(r => String(r.id ?? "").trim() === "");
        if (noId.length > 0) {
            const msg = `[geocode] id が無い行が ${noId.length} 件あります（保存できないため対象外。データ側の確認が必要）`;
            console.warn(msg);
            errors.push(msg);
        }

        const usable = rows.filter(r => String(r.id ?? "").trim() !== "");
        const withAddress = usable.filter(r => (r.full_address ?? "").trim() !== "");
        const withoutAddress = usable.filter(r => (r.full_address ?? "").trim() === "");

        // ⚠️⚠️ 何件叩くのかを必ず出す。今回の事故はこれが見えていなかった
        console.log(`[geocode] 未設定 ${rows.length} 件（住所あり ${withAddress.length} / 住所なし ${withoutAddress.length} / id なし ${noId.length}）`);

        // ---- 2. 住所が空の行は API を叩かずに畳む ----
        // ⚠️ 何もしないと**毎回 SELECT に出続ける**ので "取得不可" を入れて消す
        let closedBlank = 0;
        for (const row of withoutAddress) {
            if (await save(row, "取得不可")) closedBlank += 1;
        }
        if (closedBlank > 0) {
            console.log(`[geocode] 住所が空の ${closedBlank} 件を「取得不可」にしました（今後は対象外）`);
        }

        // ---- 3. 住所のある行を Geocoding にかける ----
        const targets = withAddress.slice(0, MAX_PER_RUN);
        if (withAddress.length > MAX_PER_RUN) {
            // ⚠️ 残りは次回に回る。⚠️ ただし毎回上限に張り付くなら保存できていない疑い
            const msg = `[geocode] 対象が上限 ${MAX_PER_RUN} を超えています（${withAddress.length} 件）。残り ${withAddress.length - MAX_PER_RUN} 件は次回に回します`;
            console.warn(msg);
            errors.push(msg);
        }

        let ok = 0;
        let nohit = 0;
        let failed = 0;
        let consecutiveErrors = 0;

        for (const row of targets) {
            const address = (row.full_address ?? "").trim();
            const result = await fetchLatLng(address);
            await sleep(INTERVAL_MS);

            if (result.kind === "fatal") {
                // ⚠️⚠️ ここで必ず止める。続けると全件が "取得不可" になる
                const msg = `[geocode] ${result.message} 実行を中止します（${ok + nohit + failed} 件処理済み）`;
                console.error(msg);
                errors.push(msg);
                break;
            }

            if (result.kind === "error") {
                // ⚠️ 保存しない。次回やり直す
                failed += 1;
                consecutiveErrors += 1;
                const msg = `[geocode] 取得できず（次回再試行）id=${row.id} ${address}: ${result.message}`;
                console.warn(msg);
                errors.push(msg);

                if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                    const stop = `[geocode] 通信エラーが ${MAX_CONSECUTIVE_ERRORS} 件続いたため中止します`;
                    console.error(stop);
                    errors.push(stop);
                    break;
                }
                continue;
            }

            consecutiveErrors = 0;

            if (result.kind === "nohit") {
                // ⚠️ 住所として解決できない。"取得不可" を入れて**二度と叩かない**
                if (await save(row, "取得不可")) nohit += 1;
                else failed += 1;
                continue;
            }

            if (await save(row, `${result.lat},${result.lng}`)) ok += 1;
            else failed += 1;
        }

        console.log("──────────── 結果 ────────────");
        console.log(`  取得して保存    : ${ok} 件`);
        console.log(`  取得不可で確定  : ${nohit} 件（住所が空の ${closedBlank} 件を含まない）`);
        console.log(`  ⚠️ 保存できず   : ${failed} 件（次回また叩く）`);
        console.log(`  Geocoding 実行  : ${ok + nohit + failed} 回`);
        console.log("──────────────────────────────");

        // ⚠️⚠️ 保存できた行が1件も無いのに叩いているのは、今回の事故と同じ形である
        if (ok + nohit === 0 && targets.length > 0) {
            const msg = `[geocode] ${targets.length} 件叩いて1件も保存できていません。保存先の不一致を疑うこと`;
            console.error(msg);
            errors.push(msg);
        }
    } catch (err) {
        const msg = `処理全体が中断しました: ${err}`;
        console.error(msg);
        errors.push(msg);
    } finally {
        // await しないとエラーメール送信前に関数が終わり、未処理の rejection になる
        await sendErrorMail(errors, 'runGeocode.ts');
    }
};

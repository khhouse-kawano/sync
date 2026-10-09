"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGoogleReview = void 0;
const axios_1 = __importDefault(require("axios"));
const sendErrorMail_1 = require("./sendErrorMail");
/**
 * 自社店舗の Google クチコミを取得して dashboard へ保存する。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **2026-09-15 に作り直した。以前の実装は失われている。**
 *   dashboard 側の post_review.php / shop_review.php も現行から消えており、
 *   backup/back/20260625/api/actions/ にだけ残っていた。
 *   ⚠️ 最終取得は **2026-04-10**（google_review.review_history の最後）。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **Places API はクチコミを最大5件しか返さない。**
 *   これは Google の仕様で、パラメータでは増やせない。
 *   ⚠️ そのため「毎回5件を取り、**まだ持っていないものだけ足す**」形で
 *     少しずつ溜めていく。過去もこの方式だったとみられる
 *     （薩摩川内店の recently_review に13件溜まっていた）。
 *   ⚠️ 過去に遡って全件を取ることはできない。**動かし続けることが前提**である。
 *
 *   ⚠️ 全件が要るなら Google Business Profile API が必要だが、
 *     あちらは利用申請の承認と OAuth が要る（APIキーだけでは使えない）。
 *
 * ⚠️ 評価の平均（rating）と総件数（userRatingCount）は**全体の値**が取れる。
 *   クチコミ本文が5件でも、推移のグラフは正確に描ける。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **課金に注意。**
 *   `reviews` を FieldMask に入れると **Place Details Enterprise SKU** に
 *   なり、単価が上がる（`rating` / `userRatingCount` だけなら下位 SKU）。
 *   ⚠️ 31店舗 × 実行回数ぶん課金される。**毎日何度も回さないこと。**
 *
 * ⚠️ 蓄積の判定は**サーバー側（② Express）が行う**。
 *   ここは取得して送るだけである。既存データを持ってこないので往復が軽い。
 * ─────────────────────────────────────────────
 */
/** ⚠️ Geocoding で使っているものと同じキー。同じ GCP プロジェクトで Places API (New) を有効化すること */
const API_KEY = process.env.API_KEY;
const GATEWAY_URL = "https://khg-marketing.info/dashboard/api/gateway/";
/**
 * ⚠️ 1店舗ごとに1リクエスト。Places API に一括取得は無い。
 * ⚠️ 連続で叩くとレート制限に当たるので少し待つ。
 */
const INTERVAL_MS = 300;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
/**
 * 本文の整形。
 * ⚠️⚠️ **改行を `<br>` にすること。** 既存データがその形で入っており、
 *   揃えないと同じクチコミを別物と判定して二重に溜まる。
 * ⚠️ `\r\n` を先に潰さないと `<br><br>` になる。
 */
const formatText = (value) => (value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "<br>");
/** 1店舗分を Places API から取る。⚠️ 失敗しても null を返し、他店舗の取得は続ける */
const fetchPlace = async (shop, errors) => {
    try {
        const res = await axios_1.default.get(`https://places.googleapis.com/v1/places/${encodeURIComponent(shop.id)}`, {
            headers: {
                "X-Goog-Api-Key": API_KEY,
                // ⚠️⚠️ FieldMask は必須。省くとエラーになる。
                //   ⚠️ 要らない項目を足すと課金が上がるので増やさないこと
                "X-Goog-FieldMask": "rating,userRatingCount,reviews",
                // ⚠️ 日本語の本文を取るため。省くと英訳が返ることがある
                "Accept-Language": "ja",
            },
            timeout: 30000,
        });
        return res.data ?? null;
    }
    catch (err) {
        const message = axios_1.default.isAxiosError(err)
            ? `${err.response?.status ?? ""} ${JSON.stringify(err.response?.data ?? err.message)}`
            : String(err);
        const msg = `[google_review] ${shop.shop} の取得に失敗: ${message}`;
        console.error(msg);
        errors.push(msg);
        return null;
    }
};
const runGoogleReview = async () => {
    // 実行ごとに初期化する。モジュールスコープだと前回のエラーが次回に持ち越される
    const errors = [];
    if (!API_KEY) {
        const msg = "[google_review] API_KEY が設定されていません";
        console.error(msg);
        await (0, sendErrorMail_1.sendErrorMail)([msg], "google_review");
        return;
    }
    // ---- 1. 対象店舗と Place ID を取る ----
    let targets = [];
    try {
        const res = await axios_1.default.post(GATEWAY_URL, { request: "google_review", roll: "list" }, { headers: { "Content-Type": "application/json" }, timeout: 60000 });
        targets = Array.isArray(res.data?.shops) ? res.data.shops : [];
    }
    catch (err) {
        const msg = `[google_review] 対象店舗の取得に失敗: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        await (0, sendErrorMail_1.sendErrorMail)([msg], "google_review");
        return;
    }
    // ⚠️ Place ID が空の行は飛ばす。API を叩いても 404 になるだけ
    const valid = targets.filter(t => (t.id ?? "").trim() !== "");
    const missing = targets.filter(t => (t.id ?? "").trim() === "");
    if (missing.length > 0) {
        const msg = `[google_review] Place ID が未登録の店舗: ${missing.map(m => m.shop).join(" / ")}`;
        console.warn(msg);
        errors.push(msg);
    }
    console.log(`[google_review] ${valid.length} 店舗を取得します`);
    // ---- 2. Places API で1店舗ずつ取る ----
    const rows = [];
    for (const shop of valid) {
        const place = await fetchPlace(shop, errors);
        await sleep(INTERVAL_MS);
        if (!place)
            continue;
        const reviews = (place.reviews ?? []).map(r => ({
            rating: Number(r.rating ?? 0),
            // ⚠️ 既存データは publishTime をそのまま date に入れている
            date: r.publishTime ?? "",
            // ⚠️ originalText を優先する。text は翻訳されることがあり、
            //   翻訳の揺れで同じクチコミが別物に見えてしまう
            text: formatText(r.originalText?.text ?? r.text?.text ?? ""),
            name: r.name,
        }));
        rows.push({
            id: shop.id,
            average: String(place.rating ?? ""),
            amount: String(place.userRatingCount ?? ""),
            reviews,
        });
        console.log(`[google_review] ${shop.shop} … 評価 ${place.rating ?? "-"} / ${place.userRatingCount ?? "-"}件 / 本文 ${reviews.length}件`);
    }
    if (rows.length === 0) {
        const msg = "[google_review] 取得できた店舗がありません";
        console.error(msg);
        errors.push(msg);
        await (0, sendErrorMail_1.sendErrorMail)(errors, "google_review");
        return;
    }
    // ---- 3. dashboard へ送る（蓄積の判定はサーバー側） ----
    try {
        const res = await axios_1.default.post(GATEWAY_URL, { request: "google_review", roll: "save", data: rows }, { headers: { "Content-Type": "application/json" }, timeout: 60000 });
        const body = res.data ?? {};
        console.log(`[google_review] 保存完了 updated=${body.updated ?? 0} added=${body.added ?? 0}`);
        // ⚠️ 一致しなかった Place ID は黙って捨てない。登録漏れに気づくため
        if (Array.isArray(body.skipped) && body.skipped.length > 0) {
            const msg = `[google_review] google_review に無い Place ID: ${body.skipped.join(" / ")}`;
            console.warn(msg);
            errors.push(msg);
        }
    }
    catch (err) {
        const msg = `[google_review] 保存に失敗: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        errors.push(msg);
    }
    await (0, sendErrorMail_1.sendErrorMail)(errors, "google_review");
};
exports.runGoogleReview = runGoogleReview;

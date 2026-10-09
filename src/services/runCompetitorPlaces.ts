/**
 * 競合他社の Place ID を収集して CSV に出す。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **このスクリプトのスコープは Place ID の収集まで。**
 *   評価・クチコミの取得は別工程（Place Details Enterprise SKU / 月1,000回）。
 *   ⚠️ ここで rating を取ろうとしないこと（→ 下の FIELD_MASK）。
 *
 * ⚠️⚠️ **`portalService` には登録していない。**
 *   全域走査は数千リクエスト・数十分かかる。定期実行や
 *   「全タスク実行」に巻き込まれて走ると事故になるため、
 *   ⚠️ 実行は `src/scripts/collectPlaces.ts` から**手で叩く**形にしている。
 *
 * ⚠️ Google Maps のスクレイピングは利用規約で禁止されている。API 以外で取らないこと。
 * ─────────────────────────────────────────────
 */

import axios from "axios";
import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";

import { resolveMunicipalities, type Bounds, type Municipality } from "../utils/municipalityList";
import {
    boundsHeightM, boundsOverlap, buildGrid, circleBounds, circleKey, circleLabel,
    splitBounds, splitCircle, unionBounds, MIN_RADIUS_M, type Circle,
} from "../utils/placesGrid";
import { judge } from "../utils/competitorFilter";

/** ⚠️ runGeocode.ts / runGoogleReview.ts と同じ鍵 */
const API_KEY = process.env.API_KEY;

/** ⚠️ 連続で叩くとレート制限に当たる。runGoogleReview.ts と同じ間隔 */
const INTERVAL_MS = 300;

/**
 * ⚠️⚠️⚠️ **Enterprise SKU の項目を足さないこと。**
 *
 *   Nearby / Text Search で **Enterprise** になるのは次の3つである:
 *     `places.rating` / `places.userRatingCount` / **`places.websiteUri`**
 *
 *   1つでも含めるとリクエスト全体が Enterprise 扱いになり、
 *   ⚠️ **無料枠が 5,000回/月 → 1,000回/月 に激減する**（$32 → $35 / 1,000回）。
 *
 * ⚠️⚠️ **`places.websiteUri` は 2026-09-15 まで**ここに入っていた。
 *   指示書 3章の「取得してよいフィールド」に含まれていたためだが、
 *   ⚠️ **公式ドキュメントでは Enterprise である**。
 *   ⚠️ そのため同日の試走（Nearby 約1,950回）は Enterprise で課金され、
 *     超過ぶん約 $33 が発生した。**戻さないこと。**
 *
 * ⚠️ 公式サイト・評価・口コミ数が要るのは後段の別工程
 *   （`GET /v1/places/{id}` = Place Details Enterprise / $20・無料枠1,000）であって、
 *   ⚠️ **走査ではない**。走査は数千回、後段は採用分だけなので桁が違う。
 */
const FIELD_MASK = [
    "places.id",
    /**
     * ⚠️ 座標。**対象自治体の外に出た結果を捨てるため**に要る。
     *   ⚠️ 半径25kmの種は市域の外まで届く。2026-09-15 の鹿児島市試走では
     *     **都城市の店舗が混ざっていた。**
     *   ⚠️ `places.location` は Essentials 相当の項目で、
     *     既に Pro の項目（displayName / types 等）を使っているため
     *     **これを足しても SKU は上がらない**。Enterprise の
     *     `rating` / `userRatingCount` とは別物である。
     */
    "places.location",
    "places.displayName",
    "places.formattedAddress",
    "places.primaryType",
    "places.types",
    "places.businessStatus",
    "places.googleMapsUri",
].join(",");

/** ⚠️ Nearby Search の上限。Google 側の仕様で20を超えられない */
const NEARBY_MAX = 20;

/** Text Search の1ページ。⚠️ nextPageToken で最大3ページ＝60件まで */
const TEXT_PAGE_SIZE = 20;
const TEXT_MAX_PAGES = 3;

/**
 * 系統A の走査タイプ。
 *
 * ⚠️⚠️ **`general_contractor` はここに入れられない。**
 *   指示書 4章のサンプルには入っているが、Places API (New) では
 *   **Table B**（応答には出るがリクエストには使えない型）である。
 *   ⚠️ 入れると円ごとに 400 が返る:
 *     `Unsupported types: general_contractor.`
 *   ⚠️ 2026-09-15 の試走で 117 リクエストすべてが これで落ちた。
 *
 * ⚠️ Table A に工務店・建設を表す型は**存在しない**
 *   （Services にあるのは electrician / plumber / painter / roofing_contractor など）。
 *   ⚠️ そのため **工務店の網羅は系統B（Text Search）が担う**。
 *
 * ⚠️ `general_contractor` は結果の `types` には入ってくるので、
 *   一次仕分け（competitorFilter.ts）ではそちらを見て判断している。
 */
const NEARBY_TYPES = ["real_estate_agency"];

/** 系統B のキーワード（指示書 4章） */
const TEXT_KEYWORDS = [
    "工務店", "注文住宅", "ハウスメーカー", "住宅展示場", "建築設計事務所", "分譲住宅",
];

/**
 * ⚠️⚠️ 系統B が60件上限に当たったとき、矩形を4分割して引き直す深さの上限。
 *   3 なら最大 4^3 = 64 の小矩形まで。
 */
const TEXT_MAX_DEPTH = 3;

/** ⚠️ これより小さい矩形は割らない。市街地の1区画まで刻んでも意味が無い */
const TEXT_MIN_SPAN_M = 1500;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Places API (New) が返す1件。⚠️ 使う分だけ書いている */
type Place = {
    id?: string;
    location?: { latitude?: number; longitude?: number };
    displayName?: { text?: string; languageCode?: string };
    formattedAddress?: string;
    primaryType?: string;
    types?: string[];
    businessStatus?: string;
    googleMapsUri?: string;
    websiteUri?: string;
};

/** 蓄積する1件 */
type Collected = {
    place_id: string;
    name: string;
    address: string;
    primary_type: string;
    types: string[];
    status: string;
    website: string;
    maps_url: string;
    /** ⚠️ 対象自治体の中かどうかを見るため。CSV には出さない */
    lat: number | null;
    lng: number | null;
    /** ⚠️ 系統A・B の両方で当たることが多いので集合で持つ */
    sources: Set<"nearby" | "text">;
    /** ヒットしたクエリ・座標（デバッグ用）。⚠️ 多くなりすぎるので先頭3件まで */
    queries: string[];
};

export type ScanOptions = {
    /** 対象。県名 / 自治体名 / `県名+自治体名`。空なら全件 */
    targets: string[];
    /** 系統A の初期半径（m） */
    radius: number;
    /** 系統A を回すか */
    nearby: boolean;
    /** 系統B を回すか */
    text: boolean;
    /** ⚠️ false なら見積りを出して**実行せずに終わる** */
    execute: boolean;
    /**
     * ⚠️⚠️ **系統A・系統B それぞれのリクエスト数の上限。**
     *   適応降下は事前に本数が読めないため、これが無いと課金が青天井になる。
     *   ⚠️ 上限に達したら**そこで止めて、それまでに集めたぶんを CSV に書く**
     *     （途中で落として全部捨てない）。
     *   ⚠️ 既定は無料枠と同じ 5,000。Nearby / Text は別プールなので各々に効かせる。
     */
    budget: number;
};

/** 見積り結果 */
type Estimate = {
    municipalities: Municipality[];
    nearbyCircles: Circle[];
    textQueries: { municipality: Municipality; keyword: string }[];
};

// ────────────────────────────────────────────
// 見積り
// ────────────────────────────────────────────

/**
 * 走査前の見積り。
 *
 * ⚠️⚠️ **系統A は「一様なグリッド」ではなく「適応降下」である。**
 *   ⚠️ ここで作るのは**種になる大きい円だけ**。実際の本数は走ってみないと分からない
 *     （0件なら降りず、20件なら4つに割って降りる）。
 *   系統B の nextPageToken・矩形分割も同様。ログでその旨を明示する。
 */
const estimate = async (options: ScanOptions, errors: string[]): Promise<Estimate> => {
    const municipalities = await resolveMunicipalities(options.targets, errors);

    const circles: Circle[] = [];
    if (options.nearby && municipalities.length > 0) {
        /**
         * ⚠️⚠️ **種は「選んだ自治体すべてを囲む1つの矩形」から作る。**
         *   ⚠️ 自治体ごとに種を置くと、隣どうしで大きく重なり、
         *     **同じ市街地を何度も降りることになる**（中心がずれるので重複排除も効かない）。
         *   ⚠️ 代わりに、**どの自治体にもかからない円はここで捨てる**ので、
         *     union が県外へはみ出しても走査対象にはならない。
         */
        /**
         * ⚠️⚠️ **Geocoding が明らかに誤った範囲を返すことがある。**
         *   ⚠️ 2026-09-15 の実測: **宮崎県西都市が南北164km**（実際は約20km）で返り、
         *     宮崎県全体より広い矩形になっていた。
         *   ⚠️ 走査は止めない（対象外の円は捨てられるので害は小さい）が、
         *     気づかないまま範囲を信じるのは危ないので必ず出す。
         */
        for (const m of municipalities) {
            const km = boundsHeightM(m.bounds) / 1000;
            if (km > 60) {
                const msg = `[competitor] ${m.fullName} の範囲が異常に広い（南北 ${Math.round(km)}km）。Geocoding の誤りの可能性`;
                console.warn(msg);
                errors.push(msg);
            }
        }

        const root = unionBounds(municipalities.map(m => m.bounds));
        if (!root) {
            const msg = "[competitor] 対象の範囲を作れませんでした";
            console.error(msg);
            errors.push(msg);
        } else {
            const seen = new Set<string>();
            const cells = buildGrid(root, options.radius);

            // ⚠️⚠️ 0件は必ず異常。範囲が壊れている（2026-09-15 に黙って0件になった）
            if (cells.length === 0) {
                const msg = `[competitor] 種の円が0件です。範囲を確認すること: ${JSON.stringify(root)}`;
                console.error(msg);
                errors.push(msg);
            }

            for (const c of cells) {
                // ⚠️ 対象自治体にかからない円は叩かない。海や県外へ撃たないため
                if (!municipalities.some(m => boundsOverlap(circleBounds(c), m.bounds))) continue;
                const key = circleKey(c);
                if (seen.has(key)) continue;
                seen.add(key);
                circles.push(c);
            }
        }
    }

    const textQueries: { municipality: Municipality; keyword: string }[] = [];
    if (options.text) {
        for (const m of municipalities) {
            for (const keyword of TEXT_KEYWORDS) textQueries.push({ municipality: m, keyword });
        }
    }

    return { municipalities, nearbyCircles: circles, textQueries };
};

// ────────────────────────────────────────────
// API 呼び出し
// ────────────────────────────────────────────

const headers = () => ({
    "X-Goog-Api-Key": API_KEY as string,
    // ⚠️ FieldMask は必須。省くとエラーになる
    "X-Goog-FieldMask": FIELD_MASK,
    "Content-Type": "application/json",
});

const searchNearby = async (circle: Circle, errors: string[]): Promise<Place[] | null> => {
    try {
        const res = await axios.post<{ places?: Place[] }>(
            "https://places.googleapis.com/v1/places:searchNearby",
            {
                includedPrimaryTypes: NEARBY_TYPES,
                locationRestriction: {
                    circle: {
                        center: { latitude: circle.lat, longitude: circle.lng },
                        radius: circle.radius,
                    },
                },
                maxResultCount: NEARBY_MAX,
                languageCode: "ja",
                regionCode: "JP",
            },
            { headers: headers(), timeout: 30000 }
        );
        return res.data?.places ?? [];
    } catch (err) {
        const message = axios.isAxiosError(err)
            ? `${err.response?.status ?? ""} ${JSON.stringify(err.response?.data ?? err.message)}`
            : String(err);
        const msg = `[competitor] Nearby 失敗 ${circleLabel(circle)}: ${message}`;
        console.error(msg);
        errors.push(msg);
        return null;
    }
};

const searchText = async (
    query: string,
    rect: Bounds,
    pageToken: string | undefined,
    errors: string[]
): Promise<{ places: Place[]; nextPageToken?: string } | null> => {
    try {
        const res = await axios.post<{ places?: Place[]; nextPageToken?: string }>(
            "https://places.googleapis.com/v1/places:searchText",
            {
                textQuery: query,
                languageCode: "ja",
                regionCode: "JP",
                pageSize: TEXT_PAGE_SIZE,
                /**
                 * ⚠️⚠️ **locationRestriction は rectangle しか受け付けない**（circle は不可）。
                 *   ⚠️ low が南西、high が北東。逆にすると0件になる。
                 *   ⚠️ これを付けることで、60件上限に当たったときに
                 *     **矩形を割って引き直せる**ようになる（町名マスタが要らない）。
                 */
                locationRestriction: {
                    rectangle: {
                        low: { latitude: rect.south, longitude: rect.west },
                        high: { latitude: rect.north, longitude: rect.east },
                    },
                },
                // ⚠️ ページ送りでは pageSize / pageToken 以外を変えてはいけない（API の制約）
                ...(pageToken ? { pageToken } : {}),
            },
            {
                headers: {
                    ...headers(),
                    // ⚠️ Text Search はページングするので nextPageToken も要る。
                    //   ⚠️ places.* の側は FIELD_MASK から増やさないこと（課金が上がる）
                    "X-Goog-FieldMask": `${FIELD_MASK},nextPageToken`,
                },
                timeout: 30000,
            }
        );
        return { places: res.data?.places ?? [], nextPageToken: res.data?.nextPageToken };
    } catch (err) {
        const message = axios.isAxiosError(err)
            ? `${err.response?.status ?? ""} ${JSON.stringify(err.response?.data ?? err.message)}`
            : String(err);
        const msg = `[competitor] Text 失敗「${query}」: ${message}`;
        console.error(msg);
        errors.push(msg);
        return null;
    }
};

// ────────────────────────────────────────────
// 蓄積
// ────────────────────────────────────────────

/** ⚠️ place_id で重複排除しながら足す。系統A・B 間の重複が多い */
const collect = (
    store: Map<string, Collected>,
    places: Place[],
    source: "nearby" | "text",
    query: string
): void => {
    for (const p of places) {
        const id = p.id ?? "";
        if (id === "") continue;

        const found = store.get(id);
        if (found) {
            found.sources.add(source);
            if (found.queries.length < 3) found.queries.push(query);
            continue;
        }

        store.set(id, {
            place_id: id,
            name: p.displayName?.text ?? "",
            address: p.formattedAddress ?? "",
            primary_type: p.primaryType ?? "",
            types: p.types ?? [],
            status: p.businessStatus ?? "",
            website: p.websiteUri ?? "",
            maps_url: p.googleMapsUri ?? "",
            lat: typeof p.location?.latitude === "number" ? p.location.latitude : null,
            lng: typeof p.location?.longitude === "number" ? p.location.longitude : null,
            sources: new Set([source]),
            queries: [query],
        });
    }
};

// ────────────────────────────────────────────
// CSV
// ────────────────────────────────────────────

const CSV_HEADER = [
    "place_id", "name", "address", "primary_type", "types",
    "status", "website", "maps_url", "source", "query", "judgement",
];

/** ⚠️ カンマ・改行・引用符を含む値があるので必ず囲む */
const csvCell = (value: string): string => `"${(value ?? "").replace(/"/g, '""')}"`;

const sourceLabel = (sources: Set<"nearby" | "text">): string =>
    sources.size === 2 ? "both" : [...sources][0];

/**
 * ⚠️⚠️ **UTF-8 BOM 付きで書く。** Excel が BOM 無しを Shift_JIS と誤認して
 *   日本語が化ける（指示書 5章）。
 */
const writeCsv = async (
    path: string,
    rows: Collected[],
    reasonOf?: (row: Collected) => string
): Promise<void> => {
    const header = reasonOf ? [...CSV_HEADER, "reason"] : CSV_HEADER;

    const lines = [header.join(",")];
    for (const r of rows) {
        const cells = [
            r.place_id, r.name, r.address, r.primary_type, r.types.join(";"),
            r.status, r.website, r.maps_url, sourceLabel(r.sources), r.queries.join(" | "),
            // ⚠️ judgement は人が記入する列。空欄で出す
            "",
        ];
        if (reasonOf) cells.push(reasonOf(r));
        lines.push(cells.map(csvCell).join(","));
    }

    await writeFile(path, "﻿" + lines.join("\r\n") + "\r\n", "utf8");
};

const outputDir = (): string => {
    const dir = join(process.cwd(), "exports", "competitor");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
};

const stamp = (): string => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`
        + `_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
};

// ────────────────────────────────────────────
// 本体
// ────────────────────────────────────────────

export const runCompetitorPlaces = async (options: ScanOptions): Promise<void> => {
    const errors: string[] = [];

    if (!API_KEY) {
        console.error("[competitor] API_KEY が設定されていません");
        return;
    }

    // ---- 0. 見積り ----
    const plan = await estimate(options, errors);

    console.log("──────────── 走査の見積り ────────────");
    console.log(`  対象自治体        : ${plan.municipalities.length} 件`);
    console.log(`  系統A（Nearby）   : 種の円 ${plan.nearbyCircles.length} 個（半径 ${options.radius}m）`);
    console.log(`  系統B（Text）     : ${plan.textQueries.length} クエリ（最小。ページ送りで最大3倍）`);
    console.log("");
    console.log(`  ⚠️ 系統A は適応降下。0件なら降りず、20件なら4分割して降りる。`);
    console.log(`     ⚠️ 実際の本数は走ってみるまで分からない（海・山は1回で捨てられる）。`);
    console.log(`  ⚠️ 系統B も60件に当たると矩形を4分割して引き直す。`);
    console.log(`  ⚠️ **上限 ${options.budget} リクエスト**に達したら打ち切り、`);
    console.log(`     それまでに集めたぶんを CSV に書く（--budget= で変更可）。`);
    console.log(`  ⚠️ 無料枠は Nearby / Text それぞれ 5,000回/月（別プール）。`);
    console.log("──────────────────────────────────────");

    if (!options.execute) {
        console.log("⚠️ 見積りのみで終了しました。実行するには --yes を付けてください。");
        return;
    }

    const store = new Map<string, Collected>();

    // ---- 1. 系統A: Nearby Search のグリッド走査 ----
    if (options.nearby) {
        // ⚠️ 適応分割で増えるので待ち行列として持つ
        const queue = [...plan.nearbyCircles];
        const done = new Set<string>(queue.map(circleKey));
        let requests = 0;
        let splits = 0;
        let truncated = 0;
        let empty = 0;

        while (queue.length > 0) {
            // ⚠️ 上限に達したら残りを捨てて抜ける。集めたぶんは下で CSV に書く
            if (requests >= options.budget) {
                const msg = `[competitor] 系統A が上限 ${options.budget} リクエストに達しました。${queue.length} 件を残して打ち切ります`;
                console.warn(msg);
                errors.push(msg);
                break;
            }

            const circle = queue.shift() as Circle;
            const places = await searchNearby(circle, errors);
            await sleep(INTERVAL_MS);
            requests += 1;

            if (!places) continue;
            if (places.length === 0) empty += 1;

            collect(store, places, "nearby", circleLabel(circle));

            // ⚠️⚠️ 20件返った＝取りこぼしている。半分の半径で割り直す
            if (places.length >= NEARBY_MAX) {
                const children = splitCircle(circle);
                if (children.length === 0) {
                    // ⚠️ これ以上割らない。取りこぼしたまま打ち切ったことを残す
                    truncated += 1;
                    const msg = `[competitor] 分割の下限（${MIN_RADIUS_M}m）に達しました。取りこぼしの可能性: ${circleLabel(circle)}`;
                    console.warn(msg);
                    errors.push(msg);
                } else {
                    splits += 1;
                    console.log(`[competitor] 20件ヒット → 半径 ${Math.round(children[0].radius)}m で4分割: ${circleLabel(circle)}`);
                    for (const child of children) {
                        const key = circleKey(child);
                        if (done.has(key)) continue;
                        done.add(key);
                        queue.push(child);
                    }
                }
            }

            if (requests % 50 === 0) {
                console.log(`[competitor] 系統A ${requests} 件実行 / 残り ${queue.length} / 収集 ${store.size} 件`);
            }
        }

        console.log(`[competitor] 系統A 完了: ${requests} リクエスト（うち0件 ${empty}） / 分割 ${splits} 回 / 打ち切り ${truncated} 件`);
    }

    // ---- 2. 系統B: Text Search のキーワード走査 ----
    if (options.text) {
        let requests = 0;

        let splits = 0;
        let truncated = 0;

        /**
         * 1つの矩形について、キーワードを最大60件まで引く。
         * ⚠️⚠️ **60件ちょうどなら取りこぼしている。**
         *   ⚠️ Text Search はページングしても**合計60件が上限**で、それ以上は取れない。
         *   ⚠️ そこで**矩形を4分割して引き直す**（系統A の適応分割と同じ考え方）。
         *   ⚠️ 深さと最小サイズで必ず止める。止めないと市街地で延々と割り続ける。
         */
        const scanRect = async (query: string, rect: Bounds, depth: number): Promise<void> => {
            // ⚠️ 上限に達したら以降は叩かない。集めたぶんは下で CSV に書く
            if (requests >= options.budget) return;

            let pageToken: string | undefined = undefined;
            let got = 0;

            for (let page = 0; page < TEXT_MAX_PAGES; page += 1) {
                const res: { places: Place[]; nextPageToken?: string } | null =
                    await searchText(query, rect, pageToken, errors);
                await sleep(INTERVAL_MS);
                requests += 1;

                if (!res) return;
                got += res.places.length;
                collect(store, res.places, "text", `text:${query}`);

                // ⚠️ トークンが無い＝これ以上ページが無い
                if (!res.nextPageToken) break;
                pageToken = res.nextPageToken;
            }

            if (got < TEXT_PAGE_SIZE * TEXT_MAX_PAGES) return;

            // ---- ここから先は60件に達した場合だけ ----
            if (depth >= TEXT_MAX_DEPTH || boundsHeightM(rect) < TEXT_MIN_SPAN_M) {
                truncated += 1;
                const msg = `[competitor] Text の分割上限に達しました。取りこぼしの可能性:「${query}」`;
                console.warn(msg);
                errors.push(msg);
                return;
            }

            splits += 1;
            console.log(`[competitor] 60件ヒット → 矩形を4分割して引き直します（深さ ${depth + 1}）:「${query}」`);
            for (const child of splitBounds(rect)) {
                await scanRect(query, child, depth + 1);
            }
        };

        for (const { municipality, keyword } of plan.textQueries) {
            await scanRect(`${municipality.name} ${keyword}`, municipality.bounds, 0);

            if (requests % 50 === 0) {
                console.log(`[competitor] 系統B ${requests} 件実行 / 収集 ${store.size} 件`);
            }
        }

        console.log(`[competitor] 系統B 分割 ${splits} 回 / 打ち切り ${truncated} 件`);

        if (requests >= options.budget) {
            const msg = `[competitor] 系統B が上限 ${options.budget} リクエストに達し、打ち切りました`;
            console.warn(msg);
            errors.push(msg);
        }

        console.log(`[competitor] 系統B 完了: ${requests} リクエスト`);
    }

    // ---- 3. 後処理（一次仕分け）----
    const likely: Collected[] = [];
    const maybe: Collected[] = [];
    const drop: { row: Collected; reason: string }[] = [];

    /**
     * ⚠️⚠️ **対象自治体の範囲の外に出たものを落とす。**
     *   ⚠️ 半径25kmの種は市域の外まで届く。2026-09-15 の鹿児島市試走では
     *     都城市の店舗が混ざっていた。3県走査なら熊本・福岡へはみ出す。
     *
     * ⚠️ 判定に使うのは自治体の**矩形**なので、実際の市境より広い。
     *   ⚠️ つまり**中にあるものを誤って落とすことは無い**（矩形は市域を必ず含む）。
     *     境界のすぐ外が少し残るが、取りこぼすよりそちらを取る。
     *
     * ⚠️ 座標が取れなかった行は落とさない（判断できないものを捨てない）。
     */
    const inArea = (row: Collected): boolean => {
        if (row.lat === null || row.lng === null) return true;
        return plan.municipalities.some(m =>
            row.lat! >= m.bounds.south && row.lat! <= m.bounds.north &&
            row.lng! >= m.bounds.west && row.lng! <= m.bounds.east);
    };

    let outOfArea = 0;

    for (const row of store.values()) {
        if (!inArea(row)) {
            outOfArea += 1;
            continue;
        }

        const result = judge({
            name: row.name,
            primaryType: row.primary_type,
            types: row.types,
            businessStatus: row.status,
        });
        if (!result.keep) drop.push({ row, reason: result.reason });
        else if (result.confidence === "likely") likely.push(row);
        else maybe.push(row);
    }

    // ⚠️ 人が見やすいよう住所順に並べる
    const byAddress = (a: Collected, b: Collected) => a.address.localeCompare(b.address, "ja");
    likely.sort(byAddress);
    maybe.sort(byAddress);
    drop.sort((a, b) => a.reason.localeCompare(b.reason, "ja"));

    // ---- 4. CSV 出力 ----
    const suffix = `${stamp()}${options.targets.length > 0 ? "_" + options.targets.join("-") : "_all"}`;
    const likelyPath = join(outputDir(), `competitor_places_${suffix}_1_有力.csv`);
    const maybePath = join(outputDir(), `competitor_places_${suffix}_2_要目視.csv`);
    const dropPath = join(outputDir(), `competitor_places_${suffix}_3_除外.csv`);

    await writeCsv(likelyPath, likely);
    await writeCsv(maybePath, maybe);
    // ⚠️ 落としたものも残す。ルールが効きすぎていないか人が確認できるようにする
    const reasons = new Map(drop.map(d => [d.row.place_id, d.reason]));
    await writeCsv(dropPath, drop.map(d => d.row), row => reasons.get(row.place_id) ?? "");

    const both = [...likely, ...maybe].filter(r => r.sources.size === 2).length;

    console.log("──────────── 結果 ────────────");
    console.log(`  収集（重複排除後）: ${store.size} 件`);
    console.log(`  ⚠️ うち対象範囲の外 : ${outOfArea} 件（捨てた。種の円が市域の外まで届くため）`);
    console.log(`  ① 有力            : ${likely.length} 件 → ${likelyPath}`);
    console.log(`  ② 要目視          : ${maybe.length} 件 → ${maybePath}`);
    console.log(`  ③ 除外            : ${drop.length} 件 → ${dropPath}`);
    console.log(`  系統A・B の両方で当たった: ${both} 件`);
    console.log(`  ⚠️ 採否の最終判断は judgement 列に人が記入すること`);
    console.log(`  ⚠️⚠️ ② も捨てないこと。建売分譲の競合は不動産会社として登録されている`);
    if (errors.length > 0) {
        console.log(`  ⚠️ 警告・失敗 ${errors.length} 件（上のログを確認すること）`);
    }
    console.log("──────────────────────────────");
};

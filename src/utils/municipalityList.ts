/**
 * 競合他社 Place ID 収集の対象自治体マスタと、その座標解決。
 *
 * ─────────────────────────────────────────────
 * ⚠️ 走査の起点にするのは「自治体の範囲（bounds）」である。
 *   ⚠️ 海上・山林に円を置いても0件が返るだけでリクエストの無駄になるため、
 *     グリッドは自治体ごとの範囲に限って敷く（→ placesGrid.ts）。
 *
 * ⚠️⚠️ **座標は Geocoding API で解決し、JSON にキャッシュする。**
 *   ⚠️ Geocoding は Places とは**別プール**なので、ここでの消費は
 *     Nearby / Text Search の無料枠（各5,000回）を減らさない。
 *   ⚠️ 2回目以降はキャッシュを読むので API を叩かない。
 *     取り直したいときはキャッシュファイルを消すこと。
 * ─────────────────────────────────────────────
 */

import axios from "axios";
import { existsSync, mkdirSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

/** ⚠️ Places と同じ鍵。runGeocode.ts / runGoogleReview.ts と共通 */
const API_KEY = process.env.API_KEY;

/** ⚠️ 連続で叩くとレート制限に当たる。既存実装（runGeocode.ts）に倣う */
const INTERVAL_MS = 200;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** 緯度経度の矩形。Geocoding の bounds / viewport をそのまま持つ */
export type Bounds = {
    north: number;
    south: number;
    east: number;
    west: number;
};

export type Municipality = {
    /** 県名（`鹿児島県` など） */
    pref: string;
    /** 市区町村名（`鹿児島市` など） */
    name: string;
    /** `鹿児島県鹿児島市`。⚠️ 同名自治体（例: 三股町）の取り違えを避けるため県名込みで解決する */
    fullName: string;
    lat: number;
    lng: number;
    bounds: Bounds;
};

/**
 * 対象自治体（87件）。
 *
 * ⚠️ 指示書 2章 #2 のとおり **鹿児島・宮崎・大分の3県**を用意している。
 *   ⚠️ 福岡・熊本を足すときは、ここへ自治体名を並べるだけでよい。
 *     座標は初回実行時に Geocoding が解決してキャッシュする。
 */
export const MUNICIPALITIES: Record<string, string[]> = {
    // 43 市町村
    鹿児島県: [
        "鹿児島市", "鹿屋市", "枕崎市", "阿久根市", "出水市", "指宿市", "西之表市",
        "垂水市", "薩摩川内市", "日置市", "曽於市", "霧島市", "いちき串木野市",
        "南さつま市", "志布志市", "奄美市", "南九州市", "伊佐市", "姶良市",
        "三島村", "十島村", "さつま町", "長島町", "湧水町", "大崎町", "東串良町",
        "錦江町", "南大隅町", "肝付町", "中種子町", "南種子町", "屋久島町",
        "大和村", "宇検村", "瀬戸内町", "龍郷町", "喜界町", "徳之島町", "天城町",
        "伊仙町", "和泊町", "知名町", "与論町",
    ],
    // 26 市町村
    宮崎県: [
        "宮崎市", "都城市", "延岡市", "日南市", "小林市", "日向市", "串間市",
        "西都市", "えびの市",
        "三股町", "高原町", "国富町", "綾町", "高鍋町", "新富町", "西米良村",
        "木城町", "川南町", "都農町", "門川町", "諸塚村", "椎葉村", "美郷町",
        "高千穂町", "日之影町", "五ヶ瀬町",
    ],
    // 18 市町村
    大分県: [
        "大分市", "別府市", "中津市", "日田市", "佐伯市", "臼杵市", "津久見市",
        "竹田市", "豊後高田市", "杵築市", "宇佐市", "豊後大野市", "由布市", "国東市",
        "姫島村", "日出町", "九重町", "玖珠町",
    ],
};

/** キャッシュの置き場。⚠️ `src` の外に置く（tsconfig の rootDir が src のため） */
const cacheDir = (): string => {
    const dir = join(process.cwd(), "exports", "competitor");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
};

const cachePath = (): string => join(cacheDir(), "municipalities.json");

type CacheFile = Record<string, Municipality>;

const loadCache = async (): Promise<CacheFile> => {
    const path = cachePath();
    if (!existsSync(path)) return {};
    try {
        return JSON.parse(await readFile(path, "utf8")) as CacheFile;
    } catch {
        // ⚠️ 壊れていても走査を止めない。取り直せばよいだけなので空として扱う
        console.warn(`[competitor] 座標キャッシュを読めませんでした。取り直します: ${path}`);
        return {};
    }
};

const saveCache = async (cache: CacheFile): Promise<void> => {
    await writeFile(cachePath(), JSON.stringify(cache, null, 2), "utf8");
};

/**
 * ⚠️⚠️ **Geocoding の矩形は `{northeast, southwest}` で返る。**
 *   `{north, south, east, west}` ではない（Places API の側とは別形式）。
 *   ⚠️ 2026-09-15、ここを取り違えて全項目が undefined になり、
 *     グリッドが**黙って0件**になっていた。必ず normalizeBounds を通すこと。
 */
type GeocodeBounds = {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
};

type GeocodeResult = {
    geometry?: {
        location?: { lat: number; lng: number };
        /** 実際の行政界。⚠️ こちらが取れるなら viewport より狭く正確 */
        bounds?: GeocodeBounds;
        /** 表示用の矩形。bounds より広めに出る */
        viewport?: GeocodeBounds;
    };
};

const normalizeBounds = (raw: GeocodeBounds): Bounds => ({
    north: raw.northeast.lat,
    south: raw.southwest.lat,
    east: raw.northeast.lng,
    west: raw.southwest.lng,
});

/** ⚠️ 4辺がそろって数値であること。欠けたまま進むとグリッドが0件になる */
export const isValidBounds = (b: Bounds | undefined): boolean =>
    !!b &&
    [b.north, b.south, b.east, b.west].every(v => typeof v === "number" && Number.isFinite(v)) &&
    b.north > b.south &&
    b.east > b.west;

/** 1自治体ぶんを Geocoding で解決する。⚠️ 失敗しても null を返し、他は続行する */
const geocodeOne = async (
    pref: string,
    name: string,
    errors: string[]
): Promise<Municipality | null> => {
    const fullName = `${pref}${name}`;
    try {
        const res = await axios.get<{ status: string; results: GeocodeResult[] }>(
            "https://maps.googleapis.com/maps/api/geocode/json",
            {
                params: {
                    address: fullName,
                    language: "ja",
                    region: "jp",
                    key: API_KEY,
                },
                timeout: 30000,
            }
        );

        if (res.data.status !== "OK" || !res.data.results?.[0]) {
            const msg = `[competitor] ${fullName} の座標を解決できません: ${res.data.status}`;
            console.warn(msg);
            errors.push(msg);
            return null;
        }

        const geometry = res.data.results[0].geometry;
        const location = geometry?.location;
        // ⚠️ bounds が無い自治体（点でしか返らない小さな村など）は viewport で代用する
        const raw = geometry?.bounds ?? geometry?.viewport;

        if (!location || !raw?.northeast || !raw?.southwest) {
            const msg = `[competitor] ${fullName} に範囲がありません（走査対象から外します）`;
            console.warn(msg);
            errors.push(msg);
            return null;
        }

        const bounds = normalizeBounds(raw);
        if (!isValidBounds(bounds)) {
            const msg = `[competitor] ${fullName} の範囲が不正です: ${JSON.stringify(bounds)}`;
            console.warn(msg);
            errors.push(msg);
            return null;
        }

        return { pref, name, fullName, lat: location.lat, lng: location.lng, bounds };
    } catch (err) {
        const msg = `[competitor] ${fullName} の座標取得に失敗: ${err instanceof Error ? err.message : String(err)}`;
        console.error(msg);
        errors.push(msg);
        return null;
    }
};

/**
 * 指定した自治体の座標・範囲を返す。
 *
 * @param targets 県名または `県名+自治体名`、あるいは自治体名のみ。空なら MUNICIPALITIES の全件
 * @returns 解決できたものだけ。⚠️ 解決できなかったものは errors に積んで返す
 */
export const resolveMunicipalities = async (
    targets: string[],
    errors: string[]
): Promise<Municipality[]> => {
    // ---- 1. 対象を (pref, name) の組に広げる ----
    const wanted: { pref: string; name: string }[] = [];

    const pushAll = (pref: string) => {
        for (const name of MUNICIPALITIES[pref]) wanted.push({ pref, name });
    };

    if (targets.length === 0) {
        for (const pref of Object.keys(MUNICIPALITIES)) pushAll(pref);
    } else {
        for (const target of targets) {
            if (MUNICIPALITIES[target]) {
                pushAll(target);
                continue;
            }
            // ⚠️ `鹿児島県鹿児島市` と `鹿児島市` の両方を受け付ける
            const hit = Object.entries(MUNICIPALITIES).flatMap(([pref, names]) =>
                names
                    .filter(name => target === name || target === `${pref}${name}`)
                    .map(name => ({ pref, name }))
            );
            if (hit.length === 0) {
                const msg = `[competitor] マスタに無い対象です: ${target}`;
                console.warn(msg);
                errors.push(msg);
                continue;
            }
            wanted.push(...hit);
        }
    }

    // ⚠️ 同じ自治体を2度走査しないよう重複を落とす
    const unique = new Map<string, { pref: string; name: string }>();
    for (const w of wanted) unique.set(`${w.pref}${w.name}`, w);

    // ---- 2. キャッシュに無いものだけ Geocoding で解決する ----
    const cache = await loadCache();
    const resolved: Municipality[] = [];
    let fetched = 0;

    for (const { pref, name } of unique.values()) {
        const fullName = `${pref}${name}`;
        const cached = cache[fullName];
        // ⚠️⚠️ キャッシュも検査する。形式を直す前のファイルが残っていると
        //   範囲が undefined のまま読み込まれ、また黙って0件になる。
        //   ⚠️ 不正なものは無視して取り直す（消してもらう手間をかけない）
        if (cached && isValidBounds(cached.bounds)) {
            resolved.push(cached);
            continue;
        }
        if (cached) {
            console.warn(`[competitor] ${fullName} のキャッシュが古い形式です。取り直します`);
        }

        if (!API_KEY) {
            const msg = "[competitor] API_KEY が設定されていません";
            console.error(msg);
            errors.push(msg);
            return resolved;
        }

        const one = await geocodeOne(pref, name, errors);
        await sleep(INTERVAL_MS);
        fetched += 1;
        if (!one) continue;

        cache[fullName] = one;
        resolved.push(one);
    }

    if (fetched > 0) {
        await saveCache(cache);
        console.log(`[competitor] 座標を ${fetched} 件 解決し、キャッシュへ保存しました（${cachePath()}）`);
    }

    return resolved;
};

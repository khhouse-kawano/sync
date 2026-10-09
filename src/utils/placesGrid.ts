/**
 * Nearby Search のグリッド座標づくりと、適応分割。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **Nearby Search は最大20件・ページング不可**（`pageToken` が無い）。
 *   ⚠️ 20件返ってきた円は **取りこぼしている**とみなし、半分の半径で
 *     4つに割り直して再走査する（指示書 4章「適応分割」）。
 *
 * ⚠️ 円は「内接する正方形」を覆う、という前提で敷いている。
 *   半径 R の円に内接する正方形の一辺は **R × √2**。
 *   ⚠️ 格子の間隔をこの一辺にすると、正方形どうしが隙間なく並び、
 *     円は少しだけ重なって全域を覆う。
 *   ⚠️ 間隔を 2R（直径）にすると**円と円の間に穴が空く**。やらないこと。
 *
 * ⚠️ 分割も同じ考え方で、一辺が半分の正方形4つに割る。
 *   親の中心から ±(一辺/4) ずらした4点が子の中心になる。
 * ─────────────────────────────────────────────
 */

import type { Bounds } from "./municipalityList";

/** 緯度1度あたりの距離（m）。⚠️ 緯度によらずほぼ一定 */
const METERS_PER_LAT_DEG = 111_320;

/** 経度1度あたりの距離（m）。⚠️ 高緯度ほど短くなるので緯度で補正する */
const metersPerLngDeg = (lat: number): number =>
    METERS_PER_LAT_DEG * Math.cos((lat * Math.PI) / 180);

export type Circle = {
    lat: number;
    lng: number;
    /** 半径（m） */
    radius: number;
};

/**
 * ⚠️ 分割の下限（m）。これ以上は割らない。
 *   ⚠️ 無いと、密集地（商業ビルに事業者が同居している等）で
 *     20件が返り続けて**無限に分割し、リクエストを撃ち続ける**。
 */
export const MIN_RADIUS_M = 250;

/** 半径 R の円が覆うとみなす正方形の一辺（m） */
const squareSide = (radius: number): number => radius * Math.SQRT2;

/**
 * 矩形の中に半径 radius の円を敷き詰める。
 *
 * ⚠️ 端は必ず矩形の外へはみ出す。狭めて穴を空けるより、
 *   重なってでも覆うほうを取る（取りこぼしのほうが痛いため）。
 */
export const buildGrid = (bounds: Bounds, radius: number): Circle[] => {
    const side = squareSide(radius);

    const latStep = side / METERS_PER_LAT_DEG;

    /**
     * ⚠️⚠️ **赤道にいちばん近い緯度で経度の刻みを決める。**
     *   経度1度あたりの距離は赤道から離れるほど短い。
     *   ⚠️ 中心緯度で計算すると、**矩形の南端では刻みが広がって穴が空く**
     *     （実測: 半径3000m に対し 3002m 離れる点が出た）。
     *   ⚠️ いちばん長い（＝赤道寄りの）値で割れば、どの行でも刻みは side 以下になる。
     */
    const widestLat = Math.min(Math.abs(bounds.north), Math.abs(bounds.south));
    const lngStep = side / metersPerLngDeg(widestLat);

    const circles: Circle[] = [];

    // ⚠️ 半歩ぶん内側から始める。矩形の角が最初の正方形に収まるようにするため
    for (let lat = bounds.south + latStep / 2; lat < bounds.north + latStep; lat += latStep) {
        for (let lng = bounds.west + lngStep / 2; lng < bounds.east + lngStep; lng += lngStep) {
            circles.push({ lat, lng, radius });
        }
    }

    return circles;
};

/**
 * 20件返った円を4つに割る。
 *
 * ⚠️ 半径が MIN_RADIUS_M を下回る場合は**空配列を返す**。
 *   呼び出し側は「取りこぼしたまま打ち切った」とログに残すこと。
 */
export const splitCircle = (circle: Circle): Circle[] => {
    const radius = circle.radius / 2;
    if (radius < MIN_RADIUS_M) return [];

    // 子の正方形の一辺は親の半分。中心は親から ±(親の一辺 / 4) ずれる
    const offset = squareSide(circle.radius) / 4;
    const dLat = offset / METERS_PER_LAT_DEG;
    // ⚠️ buildGrid と同じ理由。子は南北にずれるので、赤道寄りの子の緯度で計算する。
    //   ⚠️ 親の緯度で計算すると南側の子が外へ寄りすぎ、中央に穴が残る
    const dLng = offset / metersPerLngDeg(Math.abs(circle.lat) - dLat);

    return [
        { lat: circle.lat - dLat, lng: circle.lng - dLng, radius },
        { lat: circle.lat - dLat, lng: circle.lng + dLng, radius },
        { lat: circle.lat + dLat, lng: circle.lng - dLng, radius },
        { lat: circle.lat + dLat, lng: circle.lng + dLng, radius },
    ];
};

/**
 * 円の重複除去キー。
 * ⚠️ 自治体の矩形は隣どうし重なるため、同じ座標を二度走査しないようにする。
 *   小数4桁 ≒ 11m。これ以上の精度で分ける意味は無い。
 */
export const circleKey = (circle: Circle): string =>
    `${circle.lat.toFixed(4)},${circle.lng.toFixed(4)},${Math.round(circle.radius)}`;

/** 2つの矩形が重なるか。⚠️ 辺が接するだけ（=）は重なりとみなさない */
export const boundsOverlap = (a: Bounds, b: Bounds): boolean =>
    a.west < b.east && a.east > b.west && a.south < b.north && a.north > b.south;

/**
 * 円が覆う範囲を矩形で返す。
 * ⚠️ 走査対象の自治体と重なるかを判定するために使う。
 *   ⚠️ 内接正方形ではなく**外接矩形**（半径そのもの）で見る。
 *     狭く取ると、円の端だけが自治体にかかっている場所を落としてしまう。
 */
export const circleBounds = (circle: Circle): Bounds => {
    const dLat = circle.radius / METERS_PER_LAT_DEG;
    const dLng = circle.radius / metersPerLngDeg(circle.lat);
    return {
        north: circle.lat + dLat,
        south: circle.lat - dLat,
        east: circle.lng + dLng,
        west: circle.lng - dLng,
    };
};

/** 複数の矩形を囲む1つの矩形 */
export const unionBounds = (list: Bounds[]): Bounds | null => {
    if (list.length === 0) return null;
    return list.reduce((acc, b) => ({
        north: Math.max(acc.north, b.north),
        south: Math.min(acc.south, b.south),
        east: Math.max(acc.east, b.east),
        west: Math.min(acc.west, b.west),
    }));
};

/**
 * 矩形を4つに割る。
 * ⚠️ 系統B（Text Search）が60件上限に達したときの再検索に使う。
 *   ⚠️ Nearby と違い座標ではなく矩形で絞るため、円とは別の割り方になる。
 */
export const splitBounds = (b: Bounds): Bounds[] => {
    const midLat = (b.north + b.south) / 2;
    const midLng = (b.east + b.west) / 2;
    return [
        { north: midLat, south: b.south, east: midLng, west: b.west },
        { north: midLat, south: b.south, east: b.east, west: midLng },
        { north: b.north, south: midLat, east: midLng, west: b.west },
        { north: b.north, south: midLat, east: b.east, west: midLng },
    ];
};

/** 矩形の南北の長さ（m）。⚠️ 分割をどこで止めるかの判定に使う */
export const boundsHeightM = (b: Bounds): number => (b.north - b.south) * METERS_PER_LAT_DEG;

/** ログ・CSV の `query` 列に入れる表記 */
export const circleLabel = (circle: Circle): string =>
    `nearby@${circle.lat.toFixed(5)},${circle.lng.toFixed(5)}/r${Math.round(circle.radius)}m`;

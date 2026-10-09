"use strict";
/**
 * 一次仕分け。機械的に落とせるものだけを落とす。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **採否の最終判断は人が行う**（指示書 4章・5章）。
 *   ここは「明らかに住宅の競合ではないもの」を外すだけである。
 *   ⚠️ 迷ったら**残す**。落としすぎると人の目に触れず、
 *     取りこぼしに気づけない。
 *
 * ⚠️⚠️ 落としたものは捨てずに **除外CSVへ書き出す**。
 *   ⚠️ どのルールで落ちたかを `reason` に残すので、
 *     ルールが効きすぎていないか後から見直せる。
 * ─────────────────────────────────────────────
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.judge = void 0;
/**
 * ⚠️ Google の type で明確に住宅事業者でないもの。
 *   ⚠️ `general_contractor` / `real_estate_agency` は走査条件そのものなので
 *     ここには入れない。
 */
const EXCLUDED_TYPES = new Set([
    "electrician",
    "plumber",
    "painter",
    "roofing_contractor",
    "locksmith",
    "moving_company",
    "storage",
    "car_repair",
    "car_dealer",
    "gas_station",
    "insurance_agency",
    "bank",
    "atm",
    "lawyer",
    "accounting",
    "restaurant",
    "cafe",
    "lodging",
    "hotel",
    "supermarket",
    "convenience_store",
    "furniture_store",
    "home_goods_store",
    "hardware_store",
    "funeral_home",
    "cemetery",
    "school",
    "hospital",
    "local_government_office",
    "city_hall",
]);
/**
 * 社名から落とすもの。
 *
 * ⚠️ 「リフォーム」は専業だけを落としたいが、社名だけでは
 *   新築も手がける会社と見分けられない。⚠️ そのため
 *   **新築を示す語を併せ持つ場合は残す**（下の KEEP_KEYWORDS）。
 */
const EXCLUDED_KEYWORDS = [
    { word: "リフォーム", label: "リフォーム専業" },
    { word: "外構", label: "外構" },
    { word: "エクステリア", label: "外構" },
    { word: "造園", label: "造園" },
    { word: "解体", label: "解体" },
    { word: "電気工事", label: "電気工事" },
    { word: "電設", label: "電気工事" },
    { word: "管工事", label: "設備工事" },
    { word: "空調", label: "設備工事" },
    { word: "水道", label: "設備工事" },
    { word: "塗装", label: "塗装" },
    { word: "防水", label: "防水" },
    { word: "板金", label: "板金" },
    { word: "足場", label: "足場" },
    { word: "舗装", label: "土木" },
    { word: "土木", label: "土木" },
    { word: "測量", label: "測量" },
    { word: "シロアリ", label: "害虫防除" },
    { word: "白蟻", label: "害虫防除" },
    { word: "ガラス", label: "建材・ガラス" },
    { word: "サッシ", label: "建材・サッシ" },
    { word: "石材", label: "石材・墓石" },
    { word: "墓", label: "石材・墓石" },
    { word: "産業廃棄物", label: "廃棄物" },
    { word: "清掃", label: "清掃" },
    { word: "司法書士", label: "士業" },
    { word: "行政書士", label: "士業" },
    { word: "保険", label: "保険" },
];
/**
 * ⚠️ 除外語を含んでいても、これらを併せ持つなら**残す**。
 *   例: 「◯◯リフォーム・新築工房」は住宅も手がけている可能性がある。
 */
const KEEP_KEYWORDS = [
    "新築", "注文住宅", "工務店", "ハウス", "ホーム", "住宅", "建築",
    "不動産", "ハウジング", "建設", "住建", "住宅展示場", "モデルハウス",
];
/**
 * 「①有力」に回す社名の語。
 *
 * ⚠️⚠️ **`不動産` を入れないこと。**
 *   入れると 不動産屋がすべて①に入り、⚠️ **①が賃貸仲介で埋まって
 *   住宅会社が埋もれる**（2026-09-15 の試走では①966件の大半が不動産だった）。
 *   ⚠️ 不動産としてだけ登録されているものは「②要目視」に回す。
 */
const LIKELY_KEYWORDS = [
    "新築", "注文住宅", "工務店", "ハウス", "ホーム", "住宅", "建築",
    "ハウジング", "建設", "住建", "モデルハウス", "ビルダー",
];
/**
 * ⚠️ 住宅の競合であることを示す type。**primaryType だけでなく types 全体**を見る。
 *
 * ⚠️⚠️ `general_contractor` は Table B なので **Nearby の検索条件には使えない**が、
 *   応答の `types` には入ってくる。ここではその値を使って判断する。
 */
const TARGET_TYPES = new Set(["general_contractor", "real_estate_agency"]);
/**
 * `primaryType` がこれなら、他に何を持っていても住宅の競合ではない。
 *
 * ⚠️⚠️ **`parking_lot` が最重要。**
 *   日本の月極・コインパーキングは `real_estate_agency` を**併せ持つ**ため、
 *   下の TARGET_TYPES 判定をすり抜けてしまう。
 *   ⚠️ 2026-09-15 の鹿児島市試走では、収集1,704件のうち
 *     **897件（58%）が駐車場**だった。
 *
 * ⚠️ ここは「絶対に住宅会社ではない」ものだけに絞ること。
 *   ⚠️ 例えば `local_government_office` を入れてはいけない。
 *     住宅展示場（KTS住宅フェア）がこの型で登録されていた。
 */
const HARD_EXCLUDED_PRIMARY = new Set([
    "parking_lot",
    "atm",
    "gas_station",
    "bus_station",
    "train_station",
    "subway_station",
    "convenience_store",
    "supermarket",
]);
/**
 * 1件を判定する。
 *
 * ⚠️⚠️ **判定順が要**。2026-09-15 の試走では type を先に見ていたため、
 *   `primaryType` が `manufacturer` / `painter` というだけで
 *   **「株式会社相塲工務店」「KTS住宅フェア」まで落ちていた**。
 *   ⚠️ 型は日本の実態と合っていないので、**社名と types 全体を型より先に見る**。
 */
const judge = (item) => {
    const name = item.name ?? "";
    // 1. 閉業は無条件で落とす
    if (item.businessStatus === "CLOSED_PERMANENTLY") {
        return { keep: false, reason: "閉業（CLOSED_PERMANENTLY）" };
    }
    // 2. 絶対に住宅会社でない型は、ここで落とす。
    //    ⚠️ 駐車場は real_estate_agency を併せ持つので、先に外さないと下をすり抜ける
    if (HARD_EXCLUDED_PRIMARY.has(item.primaryType)) {
        return { keep: false, reason: `住宅と無関係な業種（${item.primaryType}）` };
    }
    // 3. 社名で落とす。⚠️ ただし新築を示す語を併せ持つなら残す
    const hitWord = EXCLUDED_KEYWORDS.find(k => name.includes(k.word));
    const hasKeepWord = KEEP_KEYWORDS.some(k => name.includes(k));
    if (hitWord && !hasKeepWord) {
        return { keep: false, reason: `社名に「${hitWord.word}」（${hitWord.label}）` };
    }
    // 4. 建築業として登録されている、または社名が住宅系 → 有力
    //    ⚠️ primaryType が manufacturer でも general_contractor を併せ持つ工務店が多いので
    //      types 全体を見る
    if (item.types.includes("general_contractor") || LIKELY_KEYWORDS.some(k => name.includes(k))) {
        return { keep: true, confidence: "likely" };
    }
    // 5. 不動産業としてだけ登録されているもの → 要目視
    //    ⚠️⚠️ **捨てないこと。** 賃貸仲介が多いが、建売分譲の競合もここに入る
    if (item.types.includes("real_estate_agency")) {
        return { keep: true, confidence: "maybe" };
    }
    // 6. ここまで住宅の手がかりが無く、明らかに別業種の型なら落とす。
    //    ⚠️ primaryType だけを見る。副次的な type で落とすと取りこぼす
    if (EXCLUDED_TYPES.has(item.primaryType)) {
        return { keep: false, reason: `対象外の業種（${item.primaryType}）` };
    }
    // 7. 判断材料が無いもの。⚠️ 落とさず、要目視に回す
    return { keep: true, confidence: "maybe" };
};
exports.judge = judge;

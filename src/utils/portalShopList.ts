// portal-app/shops.js からの移植（注文事業のポータル反響用）。
// 既存の shopList.ts とは収録件数・ブランド表記（PGH / PG HOUSE）が異なるため、
// 挙動を変えないよう統合せず別ファイルとして保持している。
//
// ─────────────────────────────────────────────
// ⚠️⚠️ 照合は runAllgritOrder / runHomesOrder / runSuumoOrder /
//   runTownlifeOrder の resolveShop() で
//
//     portalShopList.find(s => s.brand === brand && text.includes(s.area))
//
//   つまり **先に一致した1件が勝つ部分一致**である。したがって
//
//   ⚠️ 県ごとのまとまりを崩さず、**追加は末尾に**行うこと。
//     短い area（「赤村」など2文字）を先頭に置くと、他県の住所に偶然
//     一致して誤配される。末尾なら既存県が先に当たる。
//
//   ⚠️ `shop` の値は Dashboard の `shop_list.shop` と**完全一致**させること。
//     一致しない店舗名を入れると、存在しない店舗に反響が割り当てられ、
//     一覧にも集計にも現れない顧客ができる。
//     （2026-09-08 に `DJH八代店`（熊本県45件）がこれに該当し削除した。
//       shop_list にも master_data にも1件も存在しなかった。
//       これにより熊本県の DJH 反響は `DJH店舗未設定` に落ちる。）
//
//   ⚠️ `brand` は各 run*Order.ts が渡す文字列と一致させること。
//     `Nagomi`（「なごみ」ではない）／`PG HOUSE`（`PGH` ではない）が実値。
//     ここを取り違えると、そのブランドは常に「店舗未設定」になる。
// ─────────────────────────────────────────────
export type PortalShop = { brand: string; shop: string; area: string };

/**
 * ブランド → 店舗が特定できなかったときに入れる店舗名。
 *
 * ⚠️⚠️ **値はすべて Dashboard の `shop_list.shop` に実在するものである。**
 *   以前は各 run*Order.ts が
 *
 *     `${brand.replace("Nagomi", "なごみ")}店舗未設定`
 *
 *   という式を各自持っていた。`Nagomi` だけを変換していたため
 *   `PG HOUSE` が「PG HOUSE店舗未設定」になり、**shop_list に存在しない
 *   店舗名**が master_data に入っていた（正しくは「PGH店舗未設定」）。
 *   存在しない店舗に割り当てられた顧客は、店舗一覧にも集計にも現れない。
 *
 * ⚠️ 4ファイルに同じ式を散らさず、ここ1箇所で持つ。
 *   ブランドを増やすときは shop_list に「◯◯店舗未設定」があるか確認してから
 *   追加すること。
 */
const NOT_FOUND_SHOP: Record<string, string> = {
    KH: "KH店舗未設定",
    DJH: "DJH店舗未設定",
    JH: "JH店舗未設定",
    // ⚠️ ブランド表記は "Nagomi"、店舗名は「なごみ」。揃っていない
    Nagomi: "なごみ店舗未設定",
    // ⚠️⚠️ ブランド表記は "PG HOUSE"、店舗名は「PGH」。ここが今回の不具合の元
    "PG HOUSE": "PGH店舗未設定",
    "2L": "2L店舗未設定",
    FH: "FH店舗未設定"
};

/**
 * 未知のブランドのときに使う値。
 * ⚠️ これも shop_list に実在する（brand = KHG）。ブランド名を機械的に
 *   連結した文字列を作らないこと。存在しない店舗名が生まれる。
 */
const UNKNOWN_BRAND_SHOP = "ブランド・店舗未設定";

/**
 * 店舗が特定できなかったときの店舗名を返す。
 *
 * ⚠️ 未知のブランドでも例外を投げない。1ブランドの設定漏れで
 *   その回の取り込み全体を止めるべきではない。ログに出して続行する。
 */
export const notFoundShopFor = (brand: string): string => {
    const shop = NOT_FOUND_SHOP[brand];
    if (shop !== undefined) return shop;

    console.log(
        `⚠️ ブランド「${brand}」の店舗未設定名が NOT_FOUND_SHOP に未登録です。` +
        `${UNKNOWN_BRAND_SHOP} を使います（utils/portalShopList.ts）`
    );
    return UNKNOWN_BRAND_SHOP;
};

export const portalShopList: PortalShop[] = [
  { brand: "KH", shop: "KH鹿児島店", area: "鹿児島市" },
  { brand: "KH", shop: "KH鹿屋店", area: "鹿屋市" },
  { brand: "KH", shop: "KH加世田店", area: "枕崎市" },
  { brand: "KH", shop: "KH出水阿久根店", area: "阿久根市" },
  { brand: "KH", shop: "KH出水阿久根店", area: "出水市" },
  { brand: "KH", shop: "KH加世田店", area: "指宿市" },
  { brand: "KH", shop: "KH鹿屋店", area: "垂水市" },
  { brand: "KH", shop: "KH薩摩川内店", area: "薩摩川内市" },
  { brand: "KH", shop: "KH鹿児島店", area: "日置市" },
  { brand: "KH", shop: "KH霧島店", area: "曽於市" },
  { brand: "KH", shop: "KH霧島店", area: "霧島市" },
  { brand: "KH", shop: "KH鹿屋店", area: "曽於郡" },
  { brand: "KH", shop: "KH薩摩川内店", area: "いちき串木野市" },
  { brand: "KH", shop: "KH加世田店", area: "南さつま市" },
  { brand: "KH", shop: "KH鹿屋店", area: "志布志市" },
  { brand: "KH", shop: "KH加世田店", area: "南九州市" },
  { brand: "KH", shop: "KH姶良店", area: "伊佐市" },
  { brand: "KH", shop: "KH姶良店", area: "姶良市" },
  { brand: "KH", shop: "KH薩摩川内店", area: "さつま町" },
  { brand: "KH", shop: "KH出水阿久根店", area: "長島町" },
  { brand: "KH", shop: "KH霧島店", area: "湧水町" },
  { brand: "KH", shop: "KH鹿屋店", area: "大崎町" },
  { brand: "KH", shop: "KH鹿屋店", area: "東串良町" },
  { brand: "KH", shop: "KH鹿屋店", area: "錦江町" },
  { brand: "KH", shop: "KH鹿屋店", area: "南大隅町" },
  { brand: "KH", shop: "KH鹿屋店", area: "肝付町" },
  { brand: "KH", shop: "KH宮崎店", area: "宮崎市" },
  { brand: "KH", shop: "KH都城店", area: "都城市" },
  { brand: "KH", shop: "KH延岡店", area: "延岡市" },
  { brand: "KH", shop: "KH都城店", area: "日南市" },
  { brand: "KH", shop: "KH都城店", area: "小林市" },
  { brand: "KH", shop: "KH延岡店", area: "日向市" },
  { brand: "KH", shop: "KH都城店", area: "串間市" },
  { brand: "KH", shop: "KH宮崎店", area: "西都市" },
  { brand: "KH", shop: "KH都城店", area: "えびの市" },
  { brand: "KH", shop: "KH都城店", area: "三股町" },
  { brand: "KH", shop: "KH都城店", area: "高原町" },
  { brand: "KH", shop: "KH宮崎店", area: "国富町" },
  { brand: "KH", shop: "KH宮崎店", area: "綾町" },
  { brand: "KH", shop: "KH宮崎店", area: "高鍋町" },
  { brand: "KH", shop: "KH宮崎店", area: "新富町" },
  { brand: "KH", shop: "KH宮崎店", area: "西米良村" },
  { brand: "KH", shop: "KH宮崎店", area: "木城町" },
  { brand: "KH", shop: "KH宮崎店", area: "川南町" },
  { brand: "KH", shop: "KH宮崎店", area: "都農町" },
  { brand: "KH", shop: "KH延岡店", area: "門川町" },
  { brand: "KH", shop: "KH延岡店", area: "諸塚村" },
  { brand: "KH", shop: "KH延岡店", area: "椎葉村" },
  { brand: "KH", shop: "KH延岡店", area: "美郷町" },
  { brand: "KH", shop: "KH延岡店", area: "高千穂町" },
  { brand: "KH", shop: "KH延岡店", area: "日之影町" },
  { brand: "KH", shop: "KH延岡店", area: "五ヶ瀬町" },
  { brand: "KH", shop: "KH熊本店", area: "熊本市" },
  { brand: "KH", shop: "KH八代店", area: "八代市" },
  { brand: "KH", shop: "KH八代店", area: "人吉市" },
  { brand: "KH", shop: "KH熊本店", area: "荒尾市" },
  { brand: "KH", shop: "KH出水阿久根店", area: "水俣市" },
  { brand: "KH", shop: "KH熊本店", area: "玉名市" },
  { brand: "KH", shop: "KH熊本店", area: "山鹿市" },
  { brand: "KH", shop: "KH熊本店", area: "菊池市" },
  { brand: "KH", shop: "KH八代店", area: "宇土市" },
  { brand: "KH", shop: "KH八代店", area: "上天草市" },
  { brand: "KH", shop: "KH八代店", area: "宇城市" },
  { brand: "KH", shop: "KH熊本店", area: "阿蘇市" },
  { brand: "KH", shop: "KH八代店", area: "天草市" },
  { brand: "KH", shop: "KH熊本店", area: "合志市" },
  { brand: "KH", shop: "KH熊本店", area: "美里町" },
  { brand: "KH", shop: "KH熊本店", area: "玉東町" },
  { brand: "KH", shop: "KH熊本店", area: "南関町" },
  { brand: "KH", shop: "KH熊本店", area: "長洲町" },
  { brand: "KH", shop: "KH熊本店", area: "和水町" },
  { brand: "KH", shop: "KH熊本店", area: "大津町" },
  { brand: "KH", shop: "KH熊本店", area: "菊陽町" },
  { brand: "KH", shop: "KH熊本店", area: "南小国町" },
  { brand: "KH", shop: "KH熊本店", area: "小国町" },
  { brand: "KH", shop: "KH熊本店", area: "産山村" },
  { brand: "KH", shop: "KH熊本店", area: "高森町" },
  { brand: "KH", shop: "KH熊本店", area: "西原村" },
  { brand: "KH", shop: "KH熊本店", area: "南阿蘇村" },
  { brand: "KH", shop: "KH熊本店", area: "御船町" },
  { brand: "KH", shop: "KH熊本店", area: "嘉島町" },
  { brand: "KH", shop: "KH熊本店", area: "益城町" },
  { brand: "KH", shop: "KH熊本店", area: "甲佐町" },
  { brand: "KH", shop: "KH熊本店", area: "山都町" },
  { brand: "KH", shop: "KH八代店", area: "氷川町" },
  { brand: "KH", shop: "KH八代店", area: "芦北町" },
  { brand: "KH", shop: "KH八代店", area: "津奈木町" },
  { brand: "KH", shop: "KH八代店", area: "錦町" },
  { brand: "KH", shop: "KH八代店", area: "多良木町" },
  { brand: "KH", shop: "KH八代店", area: "湯前町" },
  { brand: "KH", shop: "KH八代店", area: "水上村" },
  { brand: "KH", shop: "KH八代店", area: "相良村" },
  { brand: "KH", shop: "KH八代店", area: "五木村" },
  { brand: "KH", shop: "KH八代店", area: "山江村" },
  { brand: "KH", shop: "KH八代店", area: "球磨村" },
  { brand: "KH", shop: "KH八代店", area: "あさぎり町" },
  { brand: "KH", shop: "KH八代店", area: "苓北町" },
  { brand: "KH", shop: "KH大分店", area: "大分市" },
  { brand: "KH", shop: "KH大分店", area: "別府市" },
  { brand: "KH", shop: "KH大分店", area: "中津市" },
  { brand: "KH", shop: "KH大分店", area: "日田市" },
  { brand: "KH", shop: "KH大分店", area: "佐伯市" },
  { brand: "KH", shop: "KH大分店", area: "臼杵市" },
  { brand: "KH", shop: "KH大分店", area: "津久見市" },
  { brand: "KH", shop: "KH大分店", area: "竹田市" },
  { brand: "KH", shop: "KH大分店", area: "豊後高田市" },
  { brand: "KH", shop: "KH大分店", area: "杵築市" },
  { brand: "KH", shop: "KH大分店", area: "宇佐市" },
  { brand: "KH", shop: "KH大分店", area: "豊後大野市" },
  { brand: "KH", shop: "KH大分店", area: "由布市" },
  { brand: "KH", shop: "KH大分店", area: "国東市" },
  { brand: "KH", shop: "KH大分店", area: "姫島村" },
  { brand: "KH", shop: "KH大分店", area: "日出町" },
  { brand: "KH", shop: "KH大分店", area: "九重町" },
  { brand: "KH", shop: "KH大分店", area: "玖珠町" },
  { brand: "KH", shop: "KH佐賀店", area: "佐賀市" },
  { brand: "KH", shop: "KH佐賀店", area: "唐津市" },
  { brand: "KH", shop: "KH佐賀店", area: "鳥栖市" },
  { brand: "KH", shop: "KH佐賀店", area: "多久市" },
  { brand: "KH", shop: "KH佐賀店", area: "伊万里市" },
  { brand: "KH", shop: "KH佐賀店", area: "武雄市" },
  { brand: "KH", shop: "KH佐賀店", area: "鹿島市" },
  { brand: "KH", shop: "KH佐賀店", area: "小城市" },
  { brand: "KH", shop: "KH佐賀店", area: "嬉野市" },
  { brand: "KH", shop: "KH佐賀店", area: "神埼市" },
  { brand: "KH", shop: "KH佐賀店", area: "吉野ヶ里町" },
  { brand: "KH", shop: "KH佐賀店", area: "基山町" },
  { brand: "KH", shop: "KH佐賀店", area: "上峰町" },
  { brand: "KH", shop: "KH佐賀店", area: "みやき町" },
  { brand: "KH", shop: "KH佐賀店", area: "玄海町" },
  { brand: "KH", shop: "KH佐賀店", area: "有田町" },
  { brand: "KH", shop: "KH佐賀店", area: "大町町" },
  { brand: "KH", shop: "KH佐賀店", area: "江北町" },
  { brand: "KH", shop: "KH佐賀店", area: "白石町" },
  { brand: "KH", shop: "KH佐賀店", area: "太良町" },
  { brand: "DJH", shop: "DJH鹿児島北店", area: "鹿児島市" },
  { brand: "DJH", shop: "DJH鹿屋店", area: "鹿屋市" },
  { brand: "DJH", shop: "DJH鹿児島北店", area: "枕崎市" },
  { brand: "DJH", shop: "DJH薩摩川内店", area: "阿久根市" },
  { brand: "DJH", shop: "DJH薩摩川内店", area: "出水市" },
  { brand: "DJH", shop: "DJH鹿児島北店", area: "指宿市" },
  { brand: "DJH", shop: "DJH鹿屋店", area: "垂水市" },
  { brand: "DJH", shop: "DJH薩摩川内店", area: "薩摩川内市" },
  { brand: "DJH", shop: "DJH鹿児島北店", area: "日置市" },
  { brand: "DJH", shop: "DJH霧島店", area: "曽於市" },
  { brand: "DJH", shop: "DJH霧島店", area: "霧島市" },
  { brand: "DJH", shop: "DJH薩摩川内店", area: "いちき串木野市" },
  { brand: "DJH", shop: "DJH鹿児島北店", area: "南さつま市" },
  { brand: "DJH", shop: "DJH鹿屋店", area: "志布志市" },
  { brand: "DJH", shop: "DJH鹿児島北店", area: "南九州市" },
  { brand: "DJH", shop: "DJH霧島店", area: "伊佐市" },
  { brand: "DJH", shop: "DJH霧島店", area: "姶良市" },
  { brand: "DJH", shop: "DJH薩摩川内店", area: "さつま町" },
  { brand: "DJH", shop: "DJH薩摩川内店", area: "長島町" },
  { brand: "DJH", shop: "DJH霧島店", area: "湧水町" },
  { brand: "DJH", shop: "DJH鹿屋店", area: "大崎町" },
  { brand: "DJH", shop: "DJH鹿屋店", area: "東串良町" },
  { brand: "DJH", shop: "DJH鹿屋店", area: "錦江町" },
  { brand: "DJH", shop: "DJH鹿屋店", area: "南大隅町" },
  { brand: "DJH", shop: "DJH鹿屋店", area: "肝付町" },
  { brand: "DJH", shop: "DJH宮崎店", area: "宮崎市" },
  { brand: "DJH", shop: "DJH都城店", area: "都城市" },
  { brand: "DJH", shop: "DJH延岡店", area: "延岡市" },
  { brand: "DJH", shop: "DJH都城店", area: "日南市" },
  { brand: "DJH", shop: "DJH都城店", area: "小林市" },
  { brand: "DJH", shop: "DJH延岡店", area: "日向市" },
  { brand: "DJH", shop: "DJH都城店", area: "串間市" },
  { brand: "DJH", shop: "DJH宮崎店", area: "西都市" },
  { brand: "DJH", shop: "DJH都城店", area: "えびの市" },
  { brand: "DJH", shop: "DJH都城店", area: "三股町" },
  { brand: "DJH", shop: "DJH都城店", area: "高原町" },
  { brand: "DJH", shop: "DJH宮崎店", area: "国富町" },
  { brand: "DJH", shop: "DJH宮崎店", area: "綾町" },
  { brand: "DJH", shop: "DJH宮崎店", area: "高鍋町" },
  { brand: "DJH", shop: "DJH宮崎店", area: "新富町" },
  { brand: "DJH", shop: "DJH宮崎店", area: "西米良村" },
  { brand: "DJH", shop: "DJH宮崎店", area: "木城町" },
  { brand: "DJH", shop: "DJH宮崎店", area: "川南町" },
  { brand: "DJH", shop: "DJH宮崎店", area: "都農町" },
  { brand: "DJH", shop: "DJH延岡店", area: "門川町" },
  { brand: "DJH", shop: "DJH延岡店", area: "諸塚村" },
  { brand: "DJH", shop: "DJH延岡店", area: "椎葉村" },
  { brand: "DJH", shop: "DJH延岡店", area: "美郷町" },
  { brand: "DJH", shop: "DJH延岡店", area: "高千穂町" },
  { brand: "DJH", shop: "DJH延岡店", area: "日之影町" },
  { brand: "DJH", shop: "DJH延岡店", area: "五ヶ瀬町" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "鹿児島市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "鹿屋市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "枕崎市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "阿久根市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "出水市" },
  { brand: "Nagomi", shop: "なごみ加世田店", area: "指宿市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "垂水市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "薩摩川内市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "日置市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "曽於市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "霧島市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "いちき串木野市" },
  { brand: "Nagomi", shop: "なごみ加世田店", area: "南さつま市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "志布志市" },
  { brand: "Nagomi", shop: "なごみ加世田店", area: "南九州市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "伊佐市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "姶良市" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "さつま町" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "長島町" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "湧水町" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "大崎町" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "東串良町" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "錦江町" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "南大隅町" },
  { brand: "Nagomi", shop: "なごみ鹿児島店", area: "肝付町" },
  { brand: "2L", shop: "2L鹿児島店", area: "鹿児島市" },
  { brand: "2L", shop: "2L鹿児島店", area: "鹿屋市" },
  { brand: "2L", shop: "2L鹿児島店", area: "枕崎市" },
  { brand: "2L", shop: "2L鹿児島店", area: "阿久根市" },
  { brand: "2L", shop: "2L鹿児島店", area: "出水市" },
  { brand: "2L", shop: "2L鹿児島店", area: "指宿市" },
  { brand: "2L", shop: "2L鹿児島店", area: "垂水市" },
  { brand: "2L", shop: "2L鹿児島店", area: "薩摩川内市" },
  { brand: "2L", shop: "2L鹿児島店", area: "日置市" },
  { brand: "2L", shop: "2L鹿児島店", area: "曽於市" },
  { brand: "2L", shop: "2L鹿児島店", area: "霧島市" },
  { brand: "2L", shop: "2L鹿児島店", area: "いちき串木野市" },
  { brand: "2L", shop: "2L鹿児島店", area: "南さつま市" },
  { brand: "2L", shop: "2L鹿児島店", area: "志布志市" },
  { brand: "2L", shop: "2L鹿児島店", area: "南九州市" },
  { brand: "2L", shop: "2L鹿児島店", area: "伊佐市" },
  { brand: "2L", shop: "2L鹿児島店", area: "姶良市" },
  { brand: "2L", shop: "2L鹿児島店", area: "さつま町" },
  { brand: "2L", shop: "2L鹿児島店", area: "長島町" },
  { brand: "2L", shop: "2L鹿児島店", area: "湧水町" },
  { brand: "2L", shop: "2L鹿児島店", area: "大崎町" },
  { brand: "2L", shop: "2L鹿児島店", area: "東串良町" },
  { brand: "2L", shop: "2L鹿児島店", area: "錦江町" },
  { brand: "2L", shop: "2L鹿児島店", area: "南大隅町" },
  { brand: "2L", shop: "2L鹿児島店", area: "肝付町" },
  { brand: "FH", shop: "FH鹿児島店", area: "鹿児島市" },
  { brand: "FH", shop: "FH霧島店", area: "鹿屋市" },
  { brand: "FH", shop: "FH鹿児島店", area: "枕崎市" },
  { brand: "FH", shop: "FH霧島店", area: "阿久根市" },
  { brand: "FH", shop: "FH霧島店", area: "出水市" },
  { brand: "FH", shop: "FH鹿児島店", area: "指宿市" },
  { brand: "FH", shop: "FH霧島店", area: "垂水市" },
  { brand: "FH", shop: "FH霧島店", area: "薩摩川内市" },
  { brand: "FH", shop: "FH鹿児島店", area: "日置市" },
  { brand: "FH", shop: "FH霧島店", area: "曽於市" },
  { brand: "FH", shop: "FH霧島店", area: "霧島市" },
  { brand: "FH", shop: "FH鹿児島店", area: "いちき串木野市" },
  { brand: "FH", shop: "FH鹿児島店", area: "南さつま市" },
  { brand: "FH", shop: "FH霧島店", area: "志布志市" },
  { brand: "FH", shop: "FH鹿児島店", area: "南九州市" },
  { brand: "FH", shop: "FH霧島店", area: "伊佐市" },
  { brand: "FH", shop: "FH霧島店", area: "姶良市" },
  { brand: "FH", shop: "FH霧島店", area: "さつま町" },
  { brand: "FH", shop: "FH霧島店", area: "長島町" },
  { brand: "FH", shop: "FH霧島店", area: "湧水町" },
  { brand: "FH", shop: "FH霧島店", area: "大崎町" },
  { brand: "FH", shop: "FH霧島店", area: "東串良町" },
  { brand: "FH", shop: "FH霧島店", area: "錦江町" },
  { brand: "FH", shop: "FH霧島店", area: "南大隅町" },
  { brand: "FH", shop: "FH霧島店", area: "肝付町" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "鹿児島市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "鹿屋市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "枕崎市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "阿久根市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "出水市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "指宿市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "垂水市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "薩摩川内市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "日置市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "曽於市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "霧島市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "いちき串木野市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "南さつま市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "志布志市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "南九州市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "伊佐市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "姶良市" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "さつま町" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "長島町" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "湧水町" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "大崎町" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "東串良町" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "錦江町" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "南大隅町" },
  { brand: "PG HOUSE", shop: "PGH霧島店", area: "肝付町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "宮崎市" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "都城市" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "延岡市" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "日南市" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "小林市" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "日向市" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "串間市" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "西都市" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "えびの市" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "三股町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "高原町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "国富町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "綾町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "高鍋町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "新富町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "西米良村" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "木城町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "川南町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "都農町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "門川町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "諸塚村" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "椎葉村" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "美郷町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "高千穂町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "日之影町" },
  { brand: "PG HOUSE", shop: "PGH宮崎店", area: "五ヶ瀬町" },
  { brand: "JH", shop: "JH熊本店", area: "熊本市" },
  { brand: "JH", shop: "JH八代店", area: "八代市" },
  { brand: "JH", shop: "JH八代店", area: "人吉市" },
  { brand: "JH", shop: "JH熊本店", area: "荒尾市" },
  { brand: "JH", shop: "JH八代店", area: "水俣市" },
  { brand: "JH", shop: "JH熊本店", area: "玉名市" },
  { brand: "JH", shop: "JH熊本店", area: "山鹿市" },
  { brand: "JH", shop: "JH熊本店", area: "菊池市" },
  { brand: "JH", shop: "JH八代店", area: "宇土市" },
  { brand: "JH", shop: "JH八代店", area: "上天草市" },
  { brand: "JH", shop: "JH八代店", area: "宇城市" },
  { brand: "JH", shop: "JH熊本店", area: "阿蘇市" },
  { brand: "JH", shop: "JH八代店", area: "天草市" },
  { brand: "JH", shop: "JH熊本店", area: "合志市" },
  { brand: "JH", shop: "JH熊本店", area: "美里町" },
  { brand: "JH", shop: "JH熊本店", area: "玉東町" },
  { brand: "JH", shop: "JH熊本店", area: "南関町" },
  { brand: "JH", shop: "JH熊本店", area: "長洲町" },
  { brand: "JH", shop: "JH熊本店", area: "和水町" },
  { brand: "JH", shop: "JH熊本店", area: "大津町" },
  { brand: "JH", shop: "JH熊本店", area: "菊陽町" },
  { brand: "JH", shop: "JH熊本店", area: "南小国町" },
  { brand: "JH", shop: "JH熊本店", area: "小国町" },
  { brand: "JH", shop: "JH熊本店", area: "産山村" },
  { brand: "JH", shop: "JH熊本店", area: "高森町" },
  { brand: "JH", shop: "JH熊本店", area: "西原村" },
  { brand: "JH", shop: "JH熊本店", area: "南阿蘇村" },
  { brand: "JH", shop: "JH熊本店", area: "御船町" },
  { brand: "JH", shop: "JH熊本店", area: "嘉島町" },
  { brand: "JH", shop: "JH熊本店", area: "益城町" },
  { brand: "JH", shop: "JH熊本店", area: "甲佐町" },
  { brand: "JH", shop: "JH熊本店", area: "山都町" },
  { brand: "JH", shop: "JH八代店", area: "氷川町" },
  { brand: "JH", shop: "JH八代店", area: "芦北町" },
  { brand: "JH", shop: "JH八代店", area: "津奈木町" },
  { brand: "JH", shop: "JH八代店", area: "錦町" },
  { brand: "JH", shop: "JH八代店", area: "多良木町" },
  { brand: "JH", shop: "JH八代店", area: "湯前町" },
  { brand: "JH", shop: "JH八代店", area: "水上村" },
  { brand: "JH", shop: "JH八代店", area: "相良村" },
  { brand: "JH", shop: "JH八代店", area: "五木村" },
  { brand: "JH", shop: "JH八代店", area: "山江村" },
  { brand: "JH", shop: "JH八代店", area: "球磨村" },
  { brand: "JH", shop: "JH八代店", area: "あさぎり町" },
  { brand: "JH", shop: "JH八代店", area: "苓北町" },

  // ---------------------------------------------------------------------------
  // 福岡県（2026-09-08 追加）
  //
  // 出典: 全国地方公共団体コード（J-LIS）
  //   https://www.j-lis.go.jp/spd/code-address/kyuusyuu/cms_16114187.html
  //   同ページの表の「団体名」列をそのまま area にしている。
  //   29市・29町・2村 = 60件で、福岡県の実際の市町村数と一致することを確認済み。
  //
  // ⚠️ 政令市の区は市に丸めている（北九州市7区・福岡市7区の計14件）。
  //   照合は address.includes(area) なので、
  //   「福岡県北九州市門司区…」は area「北九州市」で当たる。
  //   区ごとに持つ必要は無く、持つと区名の表記揺れに弱くなる。
  //
  // ⚠️⚠️ **必ずリストの末尾に置くこと。**
  //   照合は portalShopList.find(...) で**先に一致した1件が勝つ**。
  //   先頭に置くと、2文字の area（「赤村」など）が他県の住所に
  //   偶然一致して誤配される余地が生まれる。末尾なら既存県が先に当たる。
  //
  // ⚠️ 福岡県は KH久留米店 が一手に受ける（佐賀・久留米営業課）。
  //   他ブランド（DJH / PGH / JH / 2L / なごみ / FH）は福岡県の area を
  //   持たないため、これまでどおり「◯◯店舗未設定」に落ちる。
  //
  // ⚠️ 既存 area との重複・部分一致は無いことを確認済み
  //   （完全重複 0件／既存が福岡の area に含まれる 0件／その逆 0件）。
  // ---------------------------------------------------------------------------
  { brand: "KH", shop: "KH久留米店", area: "北九州市" },
  { brand: "KH", shop: "KH久留米店", area: "福岡市" },
  { brand: "KH", shop: "KH久留米店", area: "大牟田市" },
  { brand: "KH", shop: "KH久留米店", area: "久留米市" },
  { brand: "KH", shop: "KH久留米店", area: "直方市" },
  { brand: "KH", shop: "KH久留米店", area: "飯塚市" },
  { brand: "KH", shop: "KH久留米店", area: "田川市" },
  { brand: "KH", shop: "KH久留米店", area: "柳川市" },
  { brand: "KH", shop: "KH久留米店", area: "八女市" },
  { brand: "KH", shop: "KH久留米店", area: "筑後市" },
  { brand: "KH", shop: "KH久留米店", area: "大川市" },
  { brand: "KH", shop: "KH久留米店", area: "行橋市" },
  { brand: "KH", shop: "KH久留米店", area: "豊前市" },
  { brand: "KH", shop: "KH久留米店", area: "中間市" },
  { brand: "KH", shop: "KH久留米店", area: "小郡市" },
  { brand: "KH", shop: "KH久留米店", area: "筑紫野市" },
  { brand: "KH", shop: "KH久留米店", area: "春日市" },
  { brand: "KH", shop: "KH久留米店", area: "大野城市" },
  { brand: "KH", shop: "KH久留米店", area: "宗像市" },
  { brand: "KH", shop: "KH久留米店", area: "太宰府市" },
  { brand: "KH", shop: "KH久留米店", area: "古賀市" },
  { brand: "KH", shop: "KH久留米店", area: "福津市" },
  { brand: "KH", shop: "KH久留米店", area: "うきは市" },
  { brand: "KH", shop: "KH久留米店", area: "宮若市" },
  { brand: "KH", shop: "KH久留米店", area: "嘉麻市" },
  { brand: "KH", shop: "KH久留米店", area: "朝倉市" },
  { brand: "KH", shop: "KH久留米店", area: "みやま市" },
  { brand: "KH", shop: "KH久留米店", area: "糸島市" },
  { brand: "KH", shop: "KH久留米店", area: "那珂川市" },
  { brand: "KH", shop: "KH久留米店", area: "宇美町" },
  { brand: "KH", shop: "KH久留米店", area: "篠栗町" },
  { brand: "KH", shop: "KH久留米店", area: "志免町" },
  { brand: "KH", shop: "KH久留米店", area: "須恵町" },
  { brand: "KH", shop: "KH久留米店", area: "新宮町" },
  { brand: "KH", shop: "KH久留米店", area: "久山町" },
  { brand: "KH", shop: "KH久留米店", area: "粕屋町" },
  { brand: "KH", shop: "KH久留米店", area: "芦屋町" },
  { brand: "KH", shop: "KH久留米店", area: "水巻町" },
  { brand: "KH", shop: "KH久留米店", area: "岡垣町" },
  { brand: "KH", shop: "KH久留米店", area: "遠賀町" },
  { brand: "KH", shop: "KH久留米店", area: "小竹町" },
  { brand: "KH", shop: "KH久留米店", area: "鞍手町" },
  { brand: "KH", shop: "KH久留米店", area: "桂川町" },
  { brand: "KH", shop: "KH久留米店", area: "筑前町" },
  { brand: "KH", shop: "KH久留米店", area: "東峰村" },
  { brand: "KH", shop: "KH久留米店", area: "大刀洗町" },
  { brand: "KH", shop: "KH久留米店", area: "大木町" },
  { brand: "KH", shop: "KH久留米店", area: "広川町" },
  { brand: "KH", shop: "KH久留米店", area: "香春町" },
  { brand: "KH", shop: "KH久留米店", area: "添田町" },
  { brand: "KH", shop: "KH久留米店", area: "糸田町" },
  { brand: "KH", shop: "KH久留米店", area: "川崎町" },
  { brand: "KH", shop: "KH久留米店", area: "大任町" },
  { brand: "KH", shop: "KH久留米店", area: "赤村" },
  { brand: "KH", shop: "KH久留米店", area: "福智町" },
  { brand: "KH", shop: "KH久留米店", area: "苅田町" },
  { brand: "KH", shop: "KH久留米店", area: "みやこ町" },
  { brand: "KH", shop: "KH久留米店", area: "吉富町" },
  { brand: "KH", shop: "KH久留米店", area: "上毛町" },
  { brand: "KH", shop: "KH久留米店", area: "築上町" }
];

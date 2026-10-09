/**
 * 競合他社 Place ID 収集の実行入口。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **手で叩くもの。** portalService には登録していない。
 *   全域走査は数千リクエスト・数十分かかるため、定期実行や
 *   「全タスク実行」に巻き込まれないようにしている。
 *
 * ⚠️⚠️ **`--yes` を付けるまで実行しない。**
 *   付けない場合は見積り（リクエスト数・所要時間）を出して終わる。
 *   指示書 8章「全域走査をいきなり実行しないこと」への担保である。
 * ─────────────────────────────────────────────
 *
 * 使い方（あなたのPC / PowerShell）:
 *
 *   cd C:\Users\shinji-kawano\projects\sync
 *
 *   # 1. まず見積りだけ見る（API は自治体の座標解決以外叩かない）
 *   npx ts-node src/scripts/collectPlaces.ts 鹿児島市
 *
 *   # 2. 内容を確認してから実行する
 *   npx ts-node src/scripts/collectPlaces.ts 鹿児島市 --yes
 *
 *   # 県まるごと / 全3県
 *   npx ts-node src/scripts/collectPlaces.ts 鹿児島県 --yes
 *   npx ts-node src/scripts/collectPlaces.ts --yes
 *
 * 引数:
 *   自治体名 / 県名      対象。複数可。省略すると3県すべて
 *   --yes                実際に走査する（付けなければ見積りのみ）
 *   --radius=25000       系統A の**種**の半径（m）。既定 25000
 *   --budget=5000        リクエスト数の上限（系統A・B それぞれ）。既定 5000
 *   --nearby-only        系統A だけ
 *   --text-only          系統B だけ
 *
 * ⚠️⚠️ **--radius は「一様なグリッドの間隔」ではない。**
 *   系統A は大きい円から始めて、0件なら降りず、20件なら4分割して降りる
 *   （適応降下）。⚠️ 小さくすると海や山まで細かく撃つことになり、
 *   **リクエストが跳ね上がる。**
 *   ⚠️ 2026-09-15 の実測: 3000m の一様グリッドだと3県で 6,470回（分割前）、
 *     分割込みで 15,000〜25,000回・$320〜$640 の見込みだった。
 */

// ⚠️⚠️ **必ず最初に読む。** これより先に process.env を参照するものを
//   import すると API_KEY が undefined になる
import "../config/env";

import { runCompetitorPlaces } from "../services/runCompetitorPlaces";

const argv = process.argv.slice(2);

const flags = argv.filter(a => a.startsWith("--"));
const targets = argv.filter(a => !a.startsWith("--"));

const has = (name: string): boolean => flags.includes(name);

const radiusArg = flags.find(f => f.startsWith("--radius="));
const radius = radiusArg ? Number(radiusArg.split("=")[1]) : 25000;

if (!Number.isFinite(radius) || radius <= 0 || radius > 50000) {
    // ⚠️ Places API の locationRestriction.circle.radius は上限 50,000m
    console.error(`--radius の値が不正です: ${radiusArg}（1〜50000 の m で指定）`);
    process.exit(1);
}

const budgetArg = flags.find(f => f.startsWith("--budget="));
const budget = budgetArg ? Number(budgetArg.split("=")[1]) : 5000;

if (!Number.isFinite(budget) || budget <= 0) {
    console.error(`--budget の値が不正です: ${budgetArg}（1以上のリクエスト数で指定）`);
    process.exit(1);
}

const nearbyOnly = has("--nearby-only");
const textOnly = has("--text-only");

if (nearbyOnly && textOnly) {
    console.error("--nearby-only と --text-only は同時に指定できません");
    process.exit(1);
}

const unknown = flags.filter(
    f => !["--yes", "--nearby-only", "--text-only"].includes(f)
        && !f.startsWith("--radius=") && !f.startsWith("--budget=")
);
if (unknown.length > 0) {
    // ⚠️ 打ち間違いを黙って無視しない。--yes のつもりで --y と打つと走らない
    console.error(`知らないオプションです: ${unknown.join(" ")}`);
    process.exit(1);
}

runCompetitorPlaces({
    targets,
    radius,
    nearby: !textOnly,
    text: !nearbyOnly,
    execute: has("--yes"),
    budget,
}).catch(err => {
    console.error("[competitor] 中断しました:", err);
    process.exit(1);
});

import { runSuumoKaeru } from "./runSuumoKaeru";
import { runSuumoResale } from "./runSuumoResale";
import { runHomesKaeru } from "./runHomesKaeru";
import { runHomesResale } from "./runHomesResale";
import { runMemberResale } from "./runMemberResale";
import { runMemberKaeru } from "./runMemberKaeru";
import { runSumaiStep } from "./runSumaiStep";
import { runIei } from "./runIei";
import { runAthomeKaeru } from "./runAtHomeKaeru";
import { RunGeoCode } from "./runGeocode";
import { runIeuru } from "./runIeuru";
import { runReserveKaeru } from "./runReserveKaeru";
import { runReserveResale } from "./runReserveResale";
import { runCatalogResale } from "./runCatalogResale";
import { runCatalogKaeru } from "./runCatalogKaeru";
import { runIeloveProperty } from "./runIeloveProperty";
import { runPreKaeru } from "./runPreKaeru";
import { runPGMail } from "./runPGMail";
import { runSuumoResaleSummary } from "./runSuumoResaleSummary";
import { runAtHomeSummary } from "./runAtHomeSummary";
import { runHomesSummary } from "./runHomesSummary";
import { runKaeeru } from "./runKaeeru";
import { runHotlead } from "./runHotlead";
import { runSuumoOrder } from "./runSuumoOrder";
import { runHomesOrder } from "./runHomesOrder";
import { runTownlifeOrder } from "./runTownlifeOrder";
import { runAllGrit } from "./runAllGrit";
import { runGoogleReview } from "./runGoogleReview";

export const portalService = {
  process: async (options?: { targetTasks?: string[] }) => {
    const actionMap: Record<string, (id: string, pass: string, brand?: string) => Promise<void>> = {
      'suumo_kaeru': runSuumoKaeru,
      'suumo_resale': runSuumoResale,
      'homes_kaeru': runHomesKaeru,
      'homes_resale': runHomesResale,
      'member_kaeru': runMemberKaeru,
      'member_resale': runMemberResale,
      'sumai_step_resale': runSumaiStep,
      'iei_resale': runIei,
      'athome': runAthomeKaeru,
      'geoCode': RunGeoCode,
      'ieuru_resale': runIeuru,
      'reserve_kaeru': runReserveKaeru,
      'reserve_resale': runReserveResale,
      'catalog_resale': runCatalogResale,
      'catalog_kaeru': runCatalogKaeru,
      'property': runIeloveProperty,
      'pre_kaeru': runPreKaeru,
      'pg_mail': runPGMail,
      'suumo_summary': runSuumoResaleSummary,
      'suumo_summary_2': runSuumoResaleSummary,
      'athome_summary': runAtHomeSummary,
      'athome_summary_2': runAtHomeSummary,
      'homes_summary': runHomesSummary,
      'homes_summary_2': runHomesSummary,
      'kaeeru': runKaeeru,
      'hotlead': runHotlead,
      // ⚠️ 2026-10-07 追加。Hotlead の2つ目のアカウント（HOTLEAD_ID_2 / HOTLEAD_PASS_2）。
      //   ⚠️ 処理は hotlead と同じ runHotlead（⚠️ 認証情報だけ違う）。
      'hotlead_2': runHotlead,
      'suumo_order': runSuumoOrder,
      'homes_order': runHomesOrder,
      'townlife_order': runTownlifeOrder,
      // ⚠️⚠️ 2026-09-08 に注文（allgrit_order）と建売（allGrit_kaeru）を
      //   runAllGrit.ts へ統合した。ALLGRIT は1つのログインで
      //   複数の LINE アカウントを切り替える作りで、注文と建売は
      //   同じログインの中のアカウント違いだったため。
      //
      // ⚠️ 旧ファイル（runAllgritOrder.ts / runAllGritKaeru.ts）は
      //   残してあるが、**ここから外してある**。
      //   どちらが本物か分からなくなるので旧ファイルを直さないこと。
      'allgrit': runAllGrit,

      // ⚠️⚠️ 2026-09-15 新規。自社店舗の Google クチコミ（google_review テーブル）。
      //   以前の実装は失われており、取得は **2026-04-10 で止まっていた**。
      //
      // ⚠️⚠️ **毎日何度も回さないこと。** Places API で `reviews` を取ると
      //   Place Details Enterprise SKU になり単価が上がる。
      //   31店舗 × 実行回数ぶん課金される。
      //
      // ⚠️ クチコミ本文は Google の仕様で**最大5件**しか返らない。
      //   毎回5件を取り、まだ持っていないものだけを足していく形である。
      'google_review': runGoogleReview
    };

    const portal = [
      { name: 'suumo_kaeru', id: process.env.SUUMO_KAERU_ID ?? "", pass: process.env.SUUMO_KAERU_PASS ?? "" },
      { name: 'suumo_resale', id: process.env.SUUMO_RESALE_ID ?? "", pass: process.env.SUUMO_RESALE_PASS ?? "" },
      // ⚠️ brand はサマリーの保存先を分けるためだけに使う（各 runner のコメント参照）。
      //   homes_summary の brand（spec / used）は集計の分岐にも使われているので
      //   同じ値にしないこと。
      { name: 'suumo_summary', id: process.env.SUUMO_KAERU_SUMMARY_ID ?? "", pass: process.env.SUUMO_KAERU_SUMMARY_PASS ?? "", brand: 'kaeru' },
      { name: 'suumo_summary_2', id: process.env.SUUMO_RESALE_SUMMARY_ID ?? "", pass: process.env.SUUMO_RESALE_SUMMARY_PASS ?? "", brand: 'resale' },
      { name: 'homes_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'homes_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'homes_summary', id: process.env.HOMES_SUMMARY_ID ?? "", pass: process.env.HOMES_SUMMARY_PASS ?? "", brand: 'spec' },
      { name: 'homes_summary_2', id: process.env.HOMES_SUMMARY_ID_2 ?? "", pass: process.env.HOMES_SUMMARY_PASS_2 ?? "", brand: 'used' },
      { name: 'member_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'member_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'sumai_step_resale', id: process.env.SUMAI_STEP_ID ?? "", pass: process.env.SUMAI_STEP_PASS ?? "" },
      { name: 'iei_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'athome_summary', id: process.env.ATHOME_SUMMARY_ID_KAERU ?? "", pass: process.env.ATHOME_SUMMARY_PASS_KAERU ?? "", brand: 'kaeru' },
      { name: 'athome_summary_2', id: process.env.ATHOME_SUMMARY_ID_RESALE ?? "", pass: process.env.ATHOME_SUMMARY_PASS_RESALE ?? "", brand: 'resale' },
      { name: 'athome', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'ieuru_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'reserve_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'reserve_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'catalog_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'catalog_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'pre_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'property', id: process.env.IELOVE_MAIL ?? "", pass: process.env.IELOVE_PASS ?? "" },
      { name: 'pg_mail', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_APP_PASS ?? "" },
      { name: 'kaeeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      // ⚠️ 2026-10-09: brand は Dashboard の hotlead.php が担当店舗名の頭に使う（'KH' + 霧島店 → KH霧島店）。
      //   ⚠️ hotlead_2 は DJH のアカウント。⚠️ hotlead.php が受けるのは 'KH' / 'DJH' だけ（それ以外は KH 扱い）。
      { name: 'hotlead', id: process.env.HOTLEAD_ID ?? "", pass: process.env.HOTLEAD_PASS ?? "", brand: 'KH' },
      { name: 'hotlead_2', id: process.env.HOTLEAD_ID_2 ?? "", pass: process.env.HOTLEAD_PASS_2 ?? "", brand: 'DJH' },
      { name: 'geoCode' },
      // ⚠️⚠️ 自社店舗の Google クチコミ（google_review テーブル）。
      //   ⚠️ ログインを伴わないので id / pass を持たない。**geoCode と同じ形**である。
      //     認証情報の必須チェックからも外してある（下の NO_CREDENTIAL_TASKS）。
      //   ⚠️ 使う鍵は runGeocode.ts と同じ `process.env.API_KEY`。
      //     ⚠️ 同じ GCP プロジェクトで **Places API (New) を有効化**しておくこと。
      //     キーに API 制限をかけている場合は Places API を許可すること。
      { name: 'google_review' },
      // 注文事業のポータル反響（portal-app から移植）。
      // ここには代表ブランド（KH）の認証情報を持たせて未設定時のスキップ判定に使う。
      // 実際のログインは各サービスがブランドごとに process.env から読み込む。
      { name: 'suumo_order', id: process.env.SUUMO_ID_KH ?? "", pass: process.env.SUUMO_PASS_KH ?? "" },
      { name: 'homes_order', id: process.env.HOMES_ID_KH ?? "", pass: process.env.HOMES_PASS_KH ?? "" },
      { name: 'townlife_order', id: process.env.TOWNLIFE_ID_KH ?? "", pass: process.env.TOWNLIFE_PASS_KH ?? "" },
      // ⚠️⚠️ 注文（旧 allgrit_order）と建売（旧 allGrit_kaeru）を統合した1本。
      //   ALLGRIT は1つのログインで複数の LINE アカウントを切り替える作りで、
      //   注文（国分ハウジンググループ / デイジャストハウス）と
      //   建売（かえるホーム公式）は同じログインの中のアカウント違いである。
      //
      // ⚠️ 認証情報は ALLGRIT_ID / ALLGRIT_PASS に統一した。
      //   ALLGRIT_ORDER_ID / ALLGRIT_ORDER_PASS は**使わなくなった**が、
      //   切り戻せるよう環境変数自体は残してある。
      //   ⚠️ この認証情報で注文の2アカウントが見えない場合、
      //     runAllGrit がログに「見えているアカウント」を列挙する。
      { name: 'allgrit', id: process.env.ALLGRIT_ID ?? "", pass: process.env.ALLGRIT_PASS ?? "" },
    ];

    const results = [];

    /**
     * 実行対象。
     *
     * ⚠️⚠️ **targetTasks で指定された順に実行する。**
     *   2026-09-09 まで `portal.filter(...)` と書いていたため、
     *   並び順が **portal 配列の定義順**になっていた。
     *   実際のログでは targetTasks の先頭に property を指定したのに
     *   **最後に実行されていた**（意図した順に流せない）。
     *
     * ⚠️ targetTasks に portal へ無い名前が混じっていても落とさない。
     *   下のループで「実行関数がマッピングされていません」として
     *   results に残るほうが、黙って無視されるより気づける。
     */
    const targets = options?.targetTasks && options.targetTasks.length > 0
      ? options.targetTasks
          .map(name => portal.find(p => p.name === name) ?? { name })
          .filter((p): p is typeof portal[number] => p !== undefined)
      : portal;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    /**
     * ID / パスワードを持たないタスク。
     * ⚠️ ログインを伴わず、API キーだけで動くもの（鍵は各 runner が
     *   process.env から直接読む）。⚠️ ここに入れないと
     *   「認証情報が不足しています」で**実行されずに終わる。**
     */
    const NO_CREDENTIAL_TASKS = ['geoCode', 'google_review'];

    for (const brand of targets) {
      if (!NO_CREDENTIAL_TASKS.includes(brand.name) && (!brand.id || !brand.pass)) {
        results.push({
          name: brand.name,
          ok: false,
          message: `${brand.name} の認証情報が不足しています`
        });
        continue;
      }

      const executeTask = actionMap[brand.name];

      if (!executeTask) {
        results.push({
          name: brand.name,
          ok: false,
          message: `${brand.name} に対応する実行関数がマッピングされていません`
        });
        continue;
      }

      try {
        await executeTask(brand.id ?? '', brand.pass ?? '', brand.brand);

        results.push({
          name: brand.name,
          ok: true,
          message: `${brand.name} の更新が完了しました`
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[失敗] ${brand.name}: ${errorMessage}`);
        results.push({
          name: brand.name,
          ok: false,
          message: `${brand.name} の更新中にエラー: ${errorMessage}`
        });
      } finally {
        // ⚠️ 成功・失敗どちらでも待つ。
        //   2026-09-09 まで成功時だけ待っていたため、失敗が続くと
        //   ポータル側へ間を置かずに連続アクセスしていた。
        console.log(`[待機] ${brand.name} の実行後、5秒待機します...`);
        await delay(5000);
      }
    }

    /**
     * ⚠️⚠️ **ok は results の中身から決める。**
     *
     *   2026-09-09 まで `ok: true` を固定で返していた。そのため
     *   3件が失敗した実行でも応答は
     *     { ok: true, message: '7件のブランド処理が完了しました' }
     *   となり、**呼び出し側は成功と判断していた**。
     *   失敗はコンソールとエラーメールにしか出ていなかった。
     *
     * ⚠️ 失敗したタスク名を message に含める。
     *   「何件失敗」だけだと、どれを再実行すればよいか分からない。
     */
    const failed = results.filter(r => !r.ok);

    return {
      ok: failed.length === 0,
      message: failed.length === 0
        ? `${targets.length}件のブランド処理が完了しました`
        : `${targets.length}件中 ${failed.length}件が失敗しました（${failed.map(f => f.name).join(', ')}）`,
      results,
      // ⚠️ 再実行する対象をそのまま targetTasks へ渡せる形で返す
      failedTasks: failed.map(f => f.name)
    };
  }
};
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalService = void 0;
const runSuumoKaeru_1 = require("./runSuumoKaeru");
const runSuumoResale_1 = require("./runSuumoResale");
const runHomesKaeru_1 = require("./runHomesKaeru");
const runHomesResale_1 = require("./runHomesResale");
const runMemberResale_1 = require("./runMemberResale");
const runMemberKaeru_1 = require("./runMemberKaeru");
const runSumaiStep_1 = require("./runSumaiStep");
const runIei_1 = require("./runIei");
const runAtHomeKaeru_1 = require("./runAtHomeKaeru");
const runGeocode_1 = require("./runGeocode");
const runIeuru_1 = require("./runIeuru");
const runReserveKaeru_1 = require("./runReserveKaeru");
const runReserveResale_1 = require("./runReserveResale");
const runCatalogResale_1 = require("./runCatalogResale");
const runCatalogKaeru_1 = require("./runCatalogKaeru");
const runIeloveProperty_1 = require("./runIeloveProperty");
const runPreKaeru_1 = require("./runPreKaeru");
const runPGMail_1 = require("./runPGMail");
const runSuumoResaleSummary_1 = require("./runSuumoResaleSummary");
const runAtHomeSummary_1 = require("./runAtHomeSummary");
const runHomesSummary_1 = require("./runHomesSummary");
const runKaeeru_1 = require("./runKaeeru");
const runHotlead_1 = require("./runHotlead");
const runSuumoOrder_1 = require("./runSuumoOrder");
const runHomesOrder_1 = require("./runHomesOrder");
const runTownlifeOrder_1 = require("./runTownlifeOrder");
const runAllGrit_1 = require("./runAllGrit");
exports.portalService = {
    process: async (options) => {
        const actionMap = {
            'suumo_kaeru': runSuumoKaeru_1.runSuumoKaeru,
            'suumo_resale': runSuumoResale_1.runSuumoResale,
            'homes_kaeru': runHomesKaeru_1.runHomesKaeru,
            'homes_resale': runHomesResale_1.runHomesResale,
            'member_kaeru': runMemberKaeru_1.runMemberKaeru,
            'member_resale': runMemberResale_1.runMemberResale,
            'sumai_step_resale': runSumaiStep_1.runSumaiStep,
            'iei_resale': runIei_1.runIei,
            'athome': runAtHomeKaeru_1.runAthomeKaeru,
            'geoCode': runGeocode_1.RunGeoCode,
            'ieuru_resale': runIeuru_1.runIeuru,
            'reserve_kaeru': runReserveKaeru_1.runReserveKaeru,
            'reserve_resale': runReserveResale_1.runReserveResale,
            'catalog_resale': runCatalogResale_1.runCatalogResale,
            'catalog_kaeru': runCatalogKaeru_1.runCatalogKaeru,
            'property': runIeloveProperty_1.runIeloveProperty,
            'pre_kaeru': runPreKaeru_1.runPreKaeru,
            'pg_mail': runPGMail_1.runPGMail,
            'suumo_summary': runSuumoResaleSummary_1.runSuumoResaleSummary,
            'suumo_summary_2': runSuumoResaleSummary_1.runSuumoResaleSummary,
            'athome_summary': runAtHomeSummary_1.runAtHomeSummary,
            'athome_summary_2': runAtHomeSummary_1.runAtHomeSummary,
            'homes_summary': runHomesSummary_1.runHomesSummary,
            'homes_summary_2': runHomesSummary_1.runHomesSummary,
            'kaeeru': runKaeeru_1.runKaeeru,
            'hotlead': runHotlead_1.runHotlead,
            'suumo_order': runSuumoOrder_1.runSuumoOrder,
            'homes_order': runHomesOrder_1.runHomesOrder,
            'townlife_order': runTownlifeOrder_1.runTownlifeOrder,
            // ⚠️⚠️ 2026-09-08 に注文（allgrit_order）と建売（allGrit_kaeru）を
            //   runAllGrit.ts へ統合した。ALLGRIT は1つのログインで
            //   複数の LINE アカウントを切り替える作りで、注文と建売は
            //   同じログインの中のアカウント違いだったため。
            //
            // ⚠️ 旧ファイル（runAllgritOrder.ts / runAllGritKaeru.ts）は
            //   残してあるが、**ここから外してある**。
            //   どちらが本物か分からなくなるので旧ファイルを直さないこと。
            'allgrit': runAllGrit_1.runAllGrit
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
            { name: 'hotlead', id: process.env.HOTLEAD_ID ?? "", pass: process.env.HOTLEAD_PASS ?? "" },
            { name: 'geoCode' },
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
                .filter((p) => p !== undefined)
            : portal;
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        for (const brand of targets) {
            if (brand.name !== 'geoCode' && (!brand.id || !brand.pass)) {
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
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error(`[失敗] ${brand.name}: ${errorMessage}`);
                results.push({
                    name: brand.name,
                    ok: false,
                    message: `${brand.name} の更新中にエラー: ${errorMessage}`
                });
            }
            finally {
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

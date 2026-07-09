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
import { runAllGritKaeru } from "./runAllGritKaeru";
import { runReserveKaeru } from "./runReserveKaeru";
import { runReserveResale } from "./runReserveResale";
import { runCatalogResale } from "./runCatalogResale";
import { runCatalogKaeru } from "./runCatalogKaeru";
import { runIeloveProperty } from "./runIeloveProperty";
import { runPreKaeru } from "./runPreKaeru";

export const portalKaeruService = {
  process: async (options?: { targetTasks?: string[] }) => {
    const actionMap: Record<string, (id: string, pass: string) => Promise<void>> = {
      'suumo_kaeru': runSuumoKaeru,
      'suumo_resale': runSuumoResale,
      'homes_kaeru': runHomesKaeru,
      'homes_resale': runHomesResale,
      'member_kaeru': runMemberKaeru,
      'member_resale': runMemberResale,
      'sumai_step_resale': runSumaiStep,
      'iei_resale': runIei,
      'athome_kaeru': runAthomeKaeru,
      'geoCode': RunGeoCode,
      'ieuru_resale': runIeuru,
      'allGrit_kaeru': runAllGritKaeru,
      'reserve_kaeru': runReserveKaeru,
      'reserve_resale': runReserveResale,
      'catalog_resale': runCatalogResale,
      'catalog_kaeru': runCatalogKaeru,
      'property': runIeloveProperty,
      'pre_kaeru': runPreKaeru,
    };

    const portal = [
      { name: 'suumo_kaeru', id: process.env.SUUMO_KAERU_ID ?? "", pass: process.env.SUUMO_KAERU_PASS ?? "" },
      { name: 'suumo_resale', id: process.env.SUUMO_RESALE_ID ?? "", pass: process.env.SUUMO_RESALE_PASS ?? "" },
      { name: 'homes_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'homes_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'member_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'member_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'sumai_step_resale', id: process.env.SUMAI_STEP_ID ?? "", pass: process.env.SUMAI_STEP_PASS ?? "" },
      { name: 'iei_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'athome_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'ieuru_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'allGrit_kaeru', id: process.env.ALLGRIT_ID ?? "", pass: process.env.ALLGRIT_PASS ?? "" },
      { name: 'reserve_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'reserve_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'catalog_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'catalog_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      { name: 'pre_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
      // { name: 'property', id: process.env.IELOVE_MAIL ?? "", pass: process.env.IELOVE_PASS ?? "" },
      // { name: 'geoCode' },
    ];

    const results = [];

    const targets = options?.targetTasks && options.targetTasks.length > 0
      ? portal.filter(p => options.targetTasks!.includes(p.name))
      : portal;

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
        await executeTask(brand.id ?? '', brand.pass ?? '');

        results.push({
          name: brand.name,
          ok: true,
          message: `${brand.name} の更新が完了しました`
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.push({
          name: brand.name,
          ok: false,
          message: `${brand.name} の更新中にエラー: ${errorMessage}`
        });
      }
    }

    return {
      ok: true,
      message: `${targets.length}件のブランド処理が完了しました`,
      results
    };
  }
};
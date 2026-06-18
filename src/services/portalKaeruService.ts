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

export const portalKaeruService = {
  process: async () => {
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
      'ieuru_resale': runIeuru
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
      { name: 'geoCode', },
      { name: 'ieuru_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
    ];

    const results = [];

    for (const brand of portal) {
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
      message: "全ブランドの処理が完了しました",
      results
    };
  }
};
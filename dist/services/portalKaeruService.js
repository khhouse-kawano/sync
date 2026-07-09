"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalKaeruService = void 0;
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
const runAllGritKaeru_1 = require("./runAllGritKaeru");
const runReserveKaeru_1 = require("./runReserveKaeru");
const runReserveResale_1 = require("./runReserveResale");
const runCatalogResale_1 = require("./runCatalogResale");
const runCatalogKaeru_1 = require("./runCatalogKaeru");
const runIeloveProperty_1 = require("./runIeloveProperty");
const runPreKaeru_1 = require("./runPreKaeru");
exports.portalKaeruService = {
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
            'athome_kaeru': runAtHomeKaeru_1.runAthomeKaeru,
            'geoCode': runGeocode_1.RunGeoCode,
            'ieuru_resale': runIeuru_1.runIeuru,
            'allGrit_kaeru': runAllGritKaeru_1.runAllGritKaeru,
            'reserve_kaeru': runReserveKaeru_1.runReserveKaeru,
            'reserve_resale': runReserveResale_1.runReserveResale,
            'catalog_resale': runCatalogResale_1.runCatalogResale,
            'catalog_kaeru': runCatalogKaeru_1.runCatalogKaeru,
            'property': runIeloveProperty_1.runIeloveProperty,
            'pre_kaeru': runPreKaeru_1.runPreKaeru,
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
            ? portal.filter(p => options.targetTasks.includes(p.name))
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
            }
            catch (err) {
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

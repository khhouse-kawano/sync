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
const runPGMail_1 = require("./runPGMail");
const runSuumoResaleSummary_1 = require("./runSuumoResaleSummary");
const runAtHomeSummary_1 = require("./runAtHomeSummary");
const runHomesSummary_1 = require("./runHomesSummary");
const runKaeeru_1 = require("./runKaeeru");
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
            'athome': runAtHomeKaeru_1.runAthomeKaeru,
            'geoCode': runGeocode_1.RunGeoCode,
            'ieuru_resale': runIeuru_1.runIeuru,
            'allGrit_kaeru': runAllGritKaeru_1.runAllGritKaeru,
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
            'kaeeru': runKaeeru_1.runKaeeru
        };
        const portal = [
            { name: 'suumo_kaeru', id: process.env.SUUMO_KAERU_ID ?? "", pass: process.env.SUUMO_KAERU_PASS ?? "" },
            { name: 'suumo_resale', id: process.env.SUUMO_RESALE_ID ?? "", pass: process.env.SUUMO_RESALE_PASS ?? "" },
            { name: 'suumo_summary', id: process.env.SUUMO_KAERU_SUMMARY_ID ?? "", pass: process.env.SUUMO_KAERU_SUMMARY_PASS ?? "" },
            { name: 'suumo_summary_2', id: process.env.SUUMO_RESALE_SUMMARY_ID ?? "", pass: process.env.SUUMO_RESALE_SUMMARY_PASS ?? "" },
            { name: 'homes_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'homes_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'homes_summary', id: process.env.HOMES_SUMMARY_ID ?? "", pass: process.env.HOMES_SUMMARY_PASS ?? "", brand: 'spec' },
            { name: 'homes_summary_2', id: process.env.HOMES_SUMMARY_ID_2 ?? "", pass: process.env.HOMES_SUMMARY_PASS_2 ?? "", brand: 'used' },
            { name: 'member_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'member_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'sumai_step_resale', id: process.env.SUMAI_STEP_ID ?? "", pass: process.env.SUMAI_STEP_PASS ?? "" },
            { name: 'iei_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'athome_summary', id: process.env.ATHOME_SUMMARY_ID_KAERU ?? "", pass: process.env.ATHOME_SUMMARY_PASS_KAERU ?? "" },
            { name: 'athome_summary_2', id: process.env.ATHOME_SUMMARY_ID_RESALE ?? "", pass: process.env.ATHOME_SUMMARY_PASS_RESALE ?? "" },
            { name: 'athome', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'ieuru_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'allGrit_kaeru', id: process.env.ALLGRIT_ID ?? "", pass: process.env.ALLGRIT_PASS ?? "" },
            { name: 'reserve_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'reserve_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'catalog_resale', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'catalog_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'pre_kaeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_PASS ?? "" },
            { name: 'property', id: process.env.IELOVE_MAIL ?? "", pass: process.env.IELOVE_PASS ?? "" },
            { name: 'pg_mail', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_APP_PASS ?? "" },
            { name: 'kaeeru', id: process.env.GMAIL ?? "", pass: process.env.GMAIL_APP_PASS ?? "" },
            { name: 'geoCode' },
        ];
        const results = [];
        const targets = options?.targetTasks && options.targetTasks.length > 0
            ? portal.filter(p => options.targetTasks.includes(p.name))
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
                console.log(`[待機] ${brand.name} の実行後、5秒待機します...`);
                await delay(5000);
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

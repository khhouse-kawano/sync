"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suumoKaeruService = void 0;
const runSuumoKaeru_1 = require("./runSuumoKaeru");
const runSuumoResale_1 = require("./runSuumoResale");
exports.suumoKaeruService = {
    process: async () => {
        const brands = [
            { name: 'kaeru', id: process.env.SUUMO_KAERU_ID ?? "", pass: process.env.SUUMO_KAERU_PASS ?? "" },
            { name: 'resale', id: process.env.SUUMO_RESALE_ID ?? "", pass: process.env.SUUMO_RESALE_PASS ?? "" }
        ];
        const results = [];
        for (const brand of brands) {
            if (!brand.id || !brand.pass) {
                results.push({
                    name: brand.name,
                    ok: false,
                    message: `${brand.name} の認証情報が不足しています`
                });
                continue;
            }
            try {
                if (brand.name === 'kaeru') {
                    await (0, runSuumoKaeru_1.runSuumoKaeru)(brand.id, brand.pass);
                    results.push({
                        name: brand.name,
                        ok: true,
                        message: `${brand.name} の更新が完了しました`
                    });
                }
                else {
                    await (0, runSuumoResale_1.runSuumoResale)(brand.id, brand.pass);
                    results.push({
                        name: brand.name,
                        ok: true,
                        message: `${brand.name} の更新が完了しました`
                    });
                }
            }
            catch (err) {
                results.push({
                    name: brand.name,
                    ok: false,
                    message: `${brand.name} の更新中にエラー: ${err}`
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

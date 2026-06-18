"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estateInfoService = void 0;
const runEstateInfo_1 = require("./runEstateInfo");
exports.estateInfoService = {
    process: async () => {
        const estate_robo_id = process.env.ESTATE_ROBO_ID ?? "";
        const estate_robo_pass = process.env.ESTATE_ROBO_PASS ?? "";
        if (!estate_robo_id || !estate_robo_pass) {
            return { ok: false, message: "エステートロボの認証情報が不足しています" };
        }
        (0, runEstateInfo_1.runEstateInfo)(estate_robo_id, estate_robo_pass);
        return { ok: true, message: `${new Date().toISOString()}_アップデートを開始しました` };
    }
};

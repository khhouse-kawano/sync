"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roboService = void 0;
const runMyHomeRobo_1 = require("./runMyHomeRobo");
exports.roboService = {
    process: async (postData) => {
        const robo_id = process.env.ROBO_ID ?? "";
        const robo_pass = process.env.ROBO_PASS ?? "";
        if (!robo_id || !robo_pass) {
            return { ok: false, message: "マイホームロボの認証情報が不足しています" };
        }
        (0, runMyHomeRobo_1.runMyHomeRobo)(postData, robo_id, robo_pass);
        return { ok: true, message: `${new Date().toISOString()}_アップデートを開始しました` };
    }
};

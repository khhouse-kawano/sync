"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weekdayService = void 0;
const runWeekday_1 = require("./runWeekday");
exports.weekdayService = {
    process: async (postData) => {
        try {
            await (0, runWeekday_1.runWeekday)(postData);
            return {
                ok: true,
                message: `${new Date().toISOString()}_週末キャンペーンのメール送信`
            };
        }
        catch (error) {
            console.error("runWeekday error:", error);
            return {
                ok: false,
                message: "メール送信に失敗しました"
            };
        }
    }
};

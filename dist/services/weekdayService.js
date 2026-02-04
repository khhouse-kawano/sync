"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weekdayService = void 0;
const runWeekday_1 = require("./runWeekday");
exports.weekdayService = {
    process: async (postData) => {
        (0, runWeekday_1.runWeekday)(postData);
        return { ok: true, message: `${new Date().toISOString()}_週末キャンペーンのメール送信` };
    }
};

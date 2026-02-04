"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beforeSurveyService = void 0;
const runBeforeSurvey_1 = require("./runBeforeSurvey");
const function_1 = require("../utils/function");
const valueList_1 = require("../utils/valueList");
exports.beforeSurveyService = {
    process: async (postData) => {
        const shopValue = (0, function_1.formattedShop)(postData.shop);
        const selectedShop = valueList_1.idList.find(item => item.shop === shopValue);
        const pg_mail = selectedShop?.mail ?? "";
        const pg_pass = process.env.PG_PASS ?? "";
        (0, runBeforeSurvey_1.runBeforeSurvey)(postData, pg_mail, pg_pass);
        return { ok: true, message: `${new Date().toISOString()}_アップデートを開始しました` };
    }
};

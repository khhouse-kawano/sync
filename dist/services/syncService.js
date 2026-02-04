"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncService = void 0;
const valueList_1 = require("../utils/valueList");
const function_1 = require("../utils/function");
const runDataRegistration_1 = require("./runDataRegistration");
const runDataRegistrationBeforeInterview_1 = require("./runDataRegistrationBeforeInterview");
const keys = Object.keys(valueList_1.brandList);
exports.syncService = {
    process: async (postData) => {
        const shopValue = (0, function_1.formattedShop)(postData.shop);
        console.log(postData);
        const selectedShop = valueList_1.idList.find(item => item.shop === shopValue);
        const pg_mail = selectedShop?.mail ?? "";
        const pg_pass = process.env.PG_PASS ?? "";
        const key = keys.find(k => shopValue.toLowerCase().startsWith(k));
        const brand = key ? valueList_1.brandList[key] : "";
        if (postData.request === "before_interview") {
            await (0, runDataRegistrationBeforeInterview_1.runDataRegistrationBeforeInterview)(postData, brand, pg_mail, pg_pass);
        }
        else {
            await (0, runDataRegistration_1.runDataRegistration)(postData, brand, pg_mail, pg_pass);
        }
        return { message: `${new Date().toISOString()}_同期処理を開始しました` };
    }
};

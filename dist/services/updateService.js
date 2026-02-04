"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateService = void 0;
const valueList_1 = require("../utils/valueList");
const function_1 = require("../utils/function");
const runDataUpdateNew_1 = require("./runDataUpdateNew");
const runDataUpdateBeforeInterview_1 = require("./runDataUpdateBeforeInterview");
const runDataUpdateAfterInterview_1 = require("./runDataUpdateAfterInterview");
const keys = Object.keys(valueList_1.brandList);
exports.updateService = {
    process: async (postData) => {
        let shopValue = "";
        if (postData.shop) {
            shopValue = (0, function_1.formattedShop)(postData.shop);
        }
        else if (postData.in_charge_store) {
            shopValue = (0, function_1.formattedShop)(postData.in_charge_store);
        }
        console.log(postData);
        const selectedShop = valueList_1.idList.find(item => item.shop === shopValue);
        const pg_mail = selectedShop?.mail ?? "";
        const pg_pass = "4081Marketing";
        const key = keys.find(k => shopValue.toLowerCase().startsWith(k));
        const brand = key ? valueList_1.brandList[key] : "";
        if (postData.request === "before_interview") {
            (0, runDataUpdateBeforeInterview_1.runDataUpdateBeforeInterview)(postData, brand, pg_mail, pg_pass);
        }
        else if (postData.request === "after_interview") {
            (0, runDataUpdateAfterInterview_1.runDataUpdateAfterInterview)(postData, brand, pg_mail, pg_pass);
        }
        else {
            (0, runDataUpdateNew_1.runDataUpdateNew)(postData, brand, pg_mail, pg_pass);
        }
        return { message: `${new Date().toISOString()}_アップデートを開始しました` };
    }
};

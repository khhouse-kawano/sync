"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.breakawayService = void 0;
const axios_1 = __importDefault(require("axios"));
exports.breakawayService = {
    process: async (postData) => {
        try {
            console.log("受信データ:", postData);
            const parsed = typeof postData === "string" ? JSON.parse(postData) : postData;
            const data = { ...parsed, demand: "breakaway" };
            console.log("送信データ:", data);
            const headers = {
                Authorization: "4081Kokubu",
                "Content-Type": "application/json",
            };
            const response = await axios_1.default.post("https://khg-marketing.info/dashboard/api/", data, { headers });
            console.log("APIレスポンス:", response.data);
        }
        catch (error) {
            console.error("エラー:", error.response?.data || error.message);
        }
    }
};

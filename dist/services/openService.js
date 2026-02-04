"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openService = void 0;
const axios_1 = __importDefault(require("axios"));
exports.openService = {
    process: async (req) => {
        const userId = req.query.id;
        const now = new Date();
        console.log(`Opened by ${userId} at ${now}`);
        const postData = {
            demand: "open_myhomerobo_mail",
            id: userId,
            ua: req.headers["user-agent"],
            ip: req.ip,
        };
        try {
            const headers = {
                Authorization: "4081Kokubu",
                "Content-Type": "application/json",
            };
            await axios_1.default.post("https://khg-marketing.info/dashboard/api/", postData, {
                headers,
            });
            console.log("開封ログ送信: 成功");
        }
        catch (error) {
            if (error.response) {
                console.error("APIエラー:", error.response.status, error.response.data);
            }
            else {
                console.error("通信エラー:", error.message);
            }
        }
        // 透明PNG
        const img = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgX9nX9sAAAAASUVORK5CYII=", "base64");
        return {
            img,
            headers: {
                "Content-Type": "image/png",
                "Content-Length": img.length,
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
            }
        };
    }
};

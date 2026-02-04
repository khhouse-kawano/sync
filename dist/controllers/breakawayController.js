"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.breakawayController = void 0;
const breakawayService_1 = require("../services/breakawayService");
exports.breakawayController = {
    handleBreakaway: async (req, res) => {
        console.log("フォーム離脱情報の登録開始");
        const postData = req.body;
        res.send({
            message: `${new Date().toISOString()}_フォーム離脱情報の登録を開始しました`,
            status: "processing",
        });
        breakawayService_1.breakawayService.process(postData);
    }
};

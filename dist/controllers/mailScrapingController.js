"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailScrapingController = void 0;
const mailScrapingService_1 = require("../services/mailScrapingService");
exports.mailScrapingController = {
    handleMailScraping: async (_req, res) => {
        console.log("メールボックスの回遊スタート");
        res.send({
            message: `${new Date().toISOString()}_メールボックスの確認を開始しました`,
            status: "processing",
        });
        mailScrapingService_1.mailScrapingService.process();
    }
};

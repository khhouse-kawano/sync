"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailScrapingService = void 0;
const runMailScraping_1 = require("./runMailScraping");
exports.mailScrapingService = {
    process: async () => {
        (0, runMailScraping_1.runMailScraping)();
        return { ok: true, message: `${new Date().toISOString()}_メールボックスのスクレイピング開始` };
    }
};

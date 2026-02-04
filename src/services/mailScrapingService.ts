import { runMailScraping } from "./runMailScraping";

export const mailScrapingService = {
    process: async () => {
        runMailScraping();
        return { ok: true, message: `${new Date().toISOString()}_メールボックスのスクレイピング開始` };
    }
};

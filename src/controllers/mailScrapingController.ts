import { Request, Response } from "express";
import { mailScrapingService } from "../services/mailScrapingService";

export const mailScrapingController = {
  handleMailScraping: async (_req: Request, res: Response) => {
        console.log("メールボックスの回遊スタート");
        res.send({
            message: `${new Date().toISOString()}_メールボックスの確認を開始しました`,
            status: "processing",
        });
        mailScrapingService.process();
  }
};

import { Request, Response } from "express";
import { breakawayService } from "../services/breakawayService";

export const breakawayController = {
    handleBreakaway: async (req: Request, res: Response) => {
        console.log("フォーム離脱情報の登録開始");
        const postData = req.body;
        res.send({
            message: `${new Date().toISOString()}_フォーム離脱情報の登録を開始しました`,
            status: "processing",
        });
        breakawayService.process(postData);
    }
};

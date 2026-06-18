import { Request, Response } from "express";
import { estateInfoService } from "../services/estateInfoService";

export const estateInfoController = {
  handleEstateInfo: async (_req: Request, res: Response) => {
        console.log("土地情報の取得スタート");
        res.send({
            message: `${new Date().toISOString()}_土地情報の取得処理スタート`,
            status: "processing",
        });
        estateInfoService.process();
  }
};

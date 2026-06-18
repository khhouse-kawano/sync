import { Request, Response } from "express";
import { portalKaeruService} from "../services/portalKaeruService";

export const portalKaeruController = {
  handleSuumoKaeruController: async (_req: Request, res: Response) => {
    console.log("SUUMO(かえるホーム)の情報登録");

    res.send({
      message: `${new Date().toISOString()}_SUUMO(かえるホーム)の情報登録を開始しました`,
      status: "processing",
    });

    portalKaeruService.process()
      .then(result => console.log("SUUMO処理完了:", result))
      .catch(err => console.error("SUUMO処理エラー:", err));
  }
};

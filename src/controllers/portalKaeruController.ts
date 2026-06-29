import { Request, Response } from "express";
import { portalKaeruService} from "../services/portalKaeruService";

export const portalKaeruController = {
  handleSuumoKaeruController: async (_req: Request, res: Response) => {
    console.log("かえるホームの反響登録");

    res.send({
      message: `${new Date().toISOString()}_かえるホームの反響取り込みを開始しました`,
      status: "processing",
    });

    portalKaeruService.process()
      .then(result => console.log("処理完了:", result))
      .catch(err => console.error("処理エラー:", err));
  }
};

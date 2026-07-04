import { Request, Response } from "express";
import { portalKaeruService} from "../services/portalKaeruService";

export const portalKaeruController = {
  handleSuumoKaeruController: async (req: Request, res: Response) => {
    console.log("反響登録のリクエストを受信しました");

    const targetTasks = req.body?.targetTasks;

    // レスポンスを即座に返す（タイムアウト回避）
    res.send({
      message: `${new Date().toISOString()}_反響取り込みを開始しました`,
      status: "processing",
      acceptedTasks: targetTasks || "すべて" 
    });

    // ★ 修正: Serviceに targetTasks をオプションとして渡す
    portalKaeruService.process({ targetTasks })
      .then(result => console.log("処理完了:", result))
      .catch(err => console.error("処理エラー:", err));
  }
};
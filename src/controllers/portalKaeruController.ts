import { Request, Response } from "express";
import { portalKaeruService } from "../services/portalKaeruService";

export const portalKaeruController = {
  handleSuumoKaeruController: (req: Request, res: Response) => {
    console.log("反響登録のリクエストを受信しました");

    // リクエストボディから対象タスクを取得（Express側で json() ミドルウェアが必須）
    const targetTasks = req.body?.targetTasks;

    // レスポンスを即座に返す（HerokuのH12タイムアウト回避）
    res.status(200).json({
      message: `${new Date().toISOString()}_反響取り込みを開始しました`,
      status: "processing",
      acceptedTasks: targetTasks || "すべて" 
    });

    // Serviceに targetTasks を渡し、バックグラウンドで処理を実行
    portalKaeruService.process({ targetTasks })
      .then(result => console.log("処理完了:", result))
      .catch(err => console.error("処理エラー:", err));
  }
};
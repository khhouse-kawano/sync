"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalKaeruController = void 0;
const portalKaeruService_1 = require("../services/portalKaeruService");
exports.portalKaeruController = {
    handleSuumoKaeruController: (req, res) => {
        // ==========================================
        // ★ 原因究明のためのデバッグログ（重要）
        // ==========================================
        console.log("--- リクエスト受信 ---");
        console.log("Content-Type:", req.headers["content-type"]);
        console.log("req.bodyの生データ:", req.body);
        console.log("targetTasksの中身:", req.body?.targetTasks);
        console.log("targetTasksの型:", typeof req.body?.targetTasks);
        console.log("----------------------");
        const targetTasks = req.body?.targetTasks;
        // レスポンスを即座に返す（タイムアウト回避）
        res.status(200).json({
            message: `${new Date().toISOString()}_反響取り込みを開始しました`,
            status: "processing",
            acceptedTasks: targetTasks || "すべて"
        });
        // Serviceに targetTasks をオプションとして渡す
        portalKaeruService_1.portalKaeruService.process({ targetTasks })
            .then(result => console.log("処理完了:", result))
            .catch(err => console.error("処理エラー:", err));
    }
};

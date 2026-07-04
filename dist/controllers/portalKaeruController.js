"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalKaeruController = void 0;
const portalKaeruService_1 = require("../services/portalKaeruService");
exports.portalKaeruController = {
    handleSuumoKaeruController: async (req, res) => {
        console.log("反響登録のリクエストを受信しました");
        const targetTasks = req.body?.targetTasks;
        // レスポンスを即座に返す（タイムアウト回避）
        res.send({
            message: `${new Date().toISOString()}_反響取り込みを開始しました`,
            status: "processing",
            acceptedTasks: targetTasks || "すべて"
        });
        // ★ 修正: Serviceに targetTasks をオプションとして渡す
        portalKaeruService_1.portalKaeruService.process({ targetTasks })
            .then(result => console.log("処理完了:", result))
            .catch(err => console.error("処理エラー:", err));
    }
};

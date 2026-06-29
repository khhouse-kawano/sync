"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalKaeruController = void 0;
const portalKaeruService_1 = require("../services/portalKaeruService");
exports.portalKaeruController = {
    handleSuumoKaeruController: async (_req, res) => {
        console.log("かえるホームの反響登録");
        res.send({
            message: `${new Date().toISOString()}_かえるホームの反響取り込みを開始しました`,
            status: "processing",
        });
        portalKaeruService_1.portalKaeruService.process()
            .then(result => console.log("処理完了:", result))
            .catch(err => console.error("処理エラー:", err));
    }
};

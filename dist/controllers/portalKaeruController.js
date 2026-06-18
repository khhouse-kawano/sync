"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.portalKaeruController = void 0;
const portalKaeruService_1 = require("../services/portalKaeruService");
exports.portalKaeruController = {
    handleSuumoKaeruController: async (_req, res) => {
        console.log("SUUMO(かえるホーム)の情報登録");
        res.send({
            message: `${new Date().toISOString()}_SUUMO(かえるホーム)の情報登録を開始しました`,
            status: "processing",
        });
        portalKaeruService_1.portalKaeruService.process()
            .then(result => console.log("SUUMO処理完了:", result))
            .catch(err => console.error("SUUMO処理エラー:", err));
    }
};

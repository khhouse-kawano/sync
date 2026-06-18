"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suumoKaeruController = void 0;
const suumoKaeruService_1 = require("../services/suumoKaeruService");
exports.suumoKaeruController = {
    handleSuumoKaeruController: async (_req, res) => {
        console.log("SUUMO(かえるホーム)の情報登録");
        res.send({
            message: `${new Date().toISOString()}_SUUMO(かえるホーム)の情報登録を開始しました`,
            status: "processing",
        });
        suumoKaeruService_1.suumoKaeruService.process()
            .then(result => console.log("SUUMO処理完了:", result))
            .catch(err => console.error("SUUMO処理エラー:", err));
    }
};

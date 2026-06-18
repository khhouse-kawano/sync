"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estateInfoController = void 0;
const estateInfoService_1 = require("../services/estateInfoService");
exports.estateInfoController = {
    handleEstateInfo: async (_req, res) => {
        console.log("土地情報の取得スタート");
        res.send({
            message: `${new Date().toISOString()}_土地情報の取得処理スタート`,
            status: "processing",
        });
        estateInfoService_1.estateInfoService.process();
    }
};

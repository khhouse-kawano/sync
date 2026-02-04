"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncController = void 0;
const syncService_1 = require("../services/syncService");
exports.syncController = {
    handleSync: async (req, res) => {
        const postData = req.body;
        const result = await syncService_1.syncService.process(postData);
        res.send({ message: result.message, status: "processing" });
    }
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateController = void 0;
const updateService_1 = require("../services/updateService");
exports.updateController = {
    handleUpdate: async (req, res) => {
        const postData = req.body;
        const result = await updateService_1.updateService.process(postData);
        res.send({ message: result.message, status: "processing" });
    }
};

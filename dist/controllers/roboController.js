"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roboController = void 0;
const roboService_1 = require("../services/roboService");
exports.roboController = {
    handleRobo: async (req, res) => {
        const postData = req.body;
        const result = await roboService_1.roboService.process(postData);
        if (!result.ok) {
            res.status(500).send({ message: result.message });
            return;
        }
        res.send({ message: result.message, status: "processing" });
    }
};

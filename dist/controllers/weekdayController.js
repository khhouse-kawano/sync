"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weekdayController = void 0;
const weekdayService_1 = require("../services/weekdayService");
exports.weekdayController = {
    handleWeekday: async (req, res) => {
        const postData = req.body;
        const result = await weekdayService_1.weekdayService.process(postData);
        res.send({ message: result.message, status: "processing" });
    }
};

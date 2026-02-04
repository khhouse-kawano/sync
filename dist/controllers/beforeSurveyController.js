"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beforeSurveyController = void 0;
const beforeSurveyService_1 = require("../services/beforeSurveyService");
exports.beforeSurveyController = {
    handleBeforeSurvey: async (req, res) => {
        const updateData = req.body;
        const result = await beforeSurveyService_1.beforeSurveyService.process(updateData);
        res.send({
            message: result.message,
            status: "processing",
        });
    }
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addEventController = void 0;
const addEventService_1 = require("../services/addEventService");
exports.addEventController = {
    handleAddEvent: async (req, res) => {
        try {
            const result = await addEventService_1.addEventService.process(req.body);
            res.json({
                message: "イベント作成成功",
                eventLink: result.eventLink,
            });
        }
        catch (error) {
            console.error("Google Calendar API エラー:", error.message);
            res.status(500).json({ error: "イベント作成に失敗しました" });
        }
    }
};

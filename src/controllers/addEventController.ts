import { Request, Response } from "express";
import { addEventService } from "../services/addEventService";

export const addEventController = {
  handleAddEvent: async (req: Request, res: Response) => {
    try {
      const result = await addEventService.process(req.body);

      res.json({
        message: "イベント作成成功",
        eventLink: result.eventLink,
      });
    } catch (error: any) {
      console.error("Google Calendar API エラー:", error.message);
      res.status(500).json({ error: "イベント作成に失敗しました" });
    }
  }
};

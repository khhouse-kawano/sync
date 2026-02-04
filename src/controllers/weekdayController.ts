import { Request, Response } from "express";
import { weekdayService } from "../services/weekdayService";

export const weekdayController = {
    handleWeekday: async (req: Request, res: Response) => {
        const postData = req.body;
        const result = await weekdayService.process(postData);

        if (result.ok) {
            return res.send({
                message: result.message,
                status: "success"
            });
        }

        return res.send({
            message: result.message,
            status: "processing"
        });
    }
};

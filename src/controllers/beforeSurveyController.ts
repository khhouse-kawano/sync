import { Request, Response } from "express";
import { beforeSurveyService } from "../services/beforeSurveyService";

export const beforeSurveyController = {
  handleBeforeSurvey: async (req: Request, res: Response) => {
    const updateData = req.body;
    const result = await beforeSurveyService.process(updateData);
    res.send({
      message: result.message,
      status: "processing",
    });
  }
};

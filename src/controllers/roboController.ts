import { Request, Response } from "express";
import { roboService } from "../services/roboService";

export const roboController = {
  handleRobo: async (req: Request, res: Response) => {
    const postData = req.body;
    const result = await roboService.process(postData);
    if (!result.ok) {
      res.status(500).send({ message: result.message });
      return;
    }
    res.send({ message: result.message, status: "processing" });
  }
};

import { Request, Response } from "express";
import { updateService } from "../services/updateService";

export const updateController = {
  handleUpdate: async (req: Request, res: Response) => {
    const postData = req.body;
    const result = await updateService.process(postData);
    res.send({ message: result.message, status: "processing" });
  }
};

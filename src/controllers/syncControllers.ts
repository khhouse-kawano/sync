import { Request, Response } from "express";
import { syncService } from "../services/syncService";

export const syncController = {
  handleSync: async (req: Request, res: Response) => {
    const postData = req.body;
    const result = await syncService.process(postData);
    res.send({ message: result.message, status: "processing" });
  }
};

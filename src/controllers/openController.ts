import { Request, Response } from "express";
import { openService } from "../services/openService";

export const openController = {
  handleOpen: async (req: Request, res: Response) => {
    const result = await openService.process(req);

    res.writeHead(200, result.headers);
    res.end(result.img);
  }
};

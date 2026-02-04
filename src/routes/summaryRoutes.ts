import { Router } from "express";
import { summaryController } from "../controllers/summaryController";

const router = Router();

router.post("/", summaryController.handleSummary);

export default router;
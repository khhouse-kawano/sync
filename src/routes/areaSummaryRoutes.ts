import { Router } from "express";
import { areaSummaryController } from "../controllers/areaSuumaryController";

const router = Router();

router.post("/", areaSummaryController.handleAreaSummary);

export default router;
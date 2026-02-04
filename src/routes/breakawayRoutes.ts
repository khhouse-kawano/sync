import { Router } from "express";
import { breakawayController } from "../controllers/breakawayController";

const router = Router();
router.post("/", breakawayController.handleBreakaway);
export default router;

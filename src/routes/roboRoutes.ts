import { Router } from "express";
import { roboController } from "../controllers/roboController";

const router = Router();
router.post("/", roboController.handleRobo);
export default router;

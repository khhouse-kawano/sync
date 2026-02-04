import { Router } from "express";
import { openController } from "../controllers/openController";

const router = Router();
router.get("/open", openController.handleOpen);
export default router;

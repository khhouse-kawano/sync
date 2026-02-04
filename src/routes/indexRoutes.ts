import { Router } from "express";
import { syncController } from "../controllers/syncControllers";

const router = Router();
router.post("/", syncController.handleSync);
export default router;

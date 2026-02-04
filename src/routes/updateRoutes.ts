import { Router } from "express";
import { updateController } from "../controllers/updateController";

const router = Router();
router.post("/", updateController.handleUpdate);
export default router;

import { Router } from "express";
import { addEventController } from "../controllers/addEventController";

const router = Router();

router.post("/", addEventController.handleAddEvent);

export default router;

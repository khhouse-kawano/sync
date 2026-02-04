import { Router} from "express";
import { weekdayController } from "../controllers/weekdayController";

const router = Router();
router.post("/", weekdayController.handleWeekday);
export default router;
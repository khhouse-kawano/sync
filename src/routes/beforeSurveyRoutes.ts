import { Router } from "express";
import { beforeSurveyController } from "../controllers/beforeSurveyController";

const router = Router();
router.post("/", beforeSurveyController.handleBeforeSurvey);
export default router;

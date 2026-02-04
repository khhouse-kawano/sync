import { Router } from "express";
import { mailScrapingController } from "../controllers/mailScrapingController";

const router = Router();
router.post("/", mailScrapingController.handleMailScraping);
export default router;

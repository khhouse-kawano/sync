import { Router} from "express";
import { pdfToPptController } from "../controllers/pdfToPptController";

const router = Router();
router.post("/", pdfToPptController.handlePdfToPptController);
export default router;
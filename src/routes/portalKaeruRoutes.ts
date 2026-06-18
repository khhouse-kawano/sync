import { Router } from "express";
import { portalKaeruController } from "../controllers/portalKaeruController";

const router = Router();

router.options("/", (req, res) => {
    res.sendStatus(200);
});

router.post("/", portalKaeruController.handleSuumoKaeruController);
export default router;

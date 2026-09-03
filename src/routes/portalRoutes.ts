import { Router } from "express";
import { portalController } from "../controllers/portalController";

const router = Router();

router.options("/", (req, res) => {
    res.sendStatus(200);
});

router.post("/", portalController.handlePortalController);
export default router;

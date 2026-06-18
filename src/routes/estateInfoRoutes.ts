import { Router } from "express";
import { estateInfoController } from "../controllers/estateInfoController";

const router = Router();

router.options("/", (req, res) => {
    res.sendStatus(200);
});

router.post("/", estateInfoController.handleEstateInfo);
export default router;

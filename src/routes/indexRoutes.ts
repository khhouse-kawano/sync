import { Router } from "express";
import { syncController } from "../controllers/syncControllers";

const router = Router();

router.options("/", (req, res) => {
    res.sendStatus(200);
});

router.post("/", syncController.handleSync);
export default router;

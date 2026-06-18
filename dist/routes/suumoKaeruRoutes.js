"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const suumoKaeruController_1 = require("../controllers/suumoKaeruController");
const router = (0, express_1.Router)();
router.options("/", (req, res) => {
    res.sendStatus(200);
});
router.post("/", suumoKaeruController_1.suumoKaeruController.handleSuumoKaeruController);
exports.default = router;

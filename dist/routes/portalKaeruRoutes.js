"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const portalKaeruController_1 = require("../controllers/portalKaeruController");
const router = (0, express_1.Router)();
router.options("/", (req, res) => {
    res.sendStatus(200);
});
router.post("/", portalKaeruController_1.portalKaeruController.handleSuumoKaeruController);
exports.default = router;

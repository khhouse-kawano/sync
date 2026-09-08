"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const portalController_1 = require("../controllers/portalController");
const router = (0, express_1.Router)();
router.options("/", (req, res) => {
    res.sendStatus(200);
});
router.post("/", portalController_1.portalController.handlePortalController);
exports.default = router;

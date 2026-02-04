"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const syncControllers_1 = require("../controllers/syncControllers");
const router = (0, express_1.Router)();
router.options("/", (req, res) => {
    res.sendStatus(200);
});
router.post("/", syncControllers_1.syncController.handleSync);
exports.default = router;

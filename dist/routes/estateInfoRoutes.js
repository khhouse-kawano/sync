"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const estateInfoController_1 = require("../controllers/estateInfoController");
const router = (0, express_1.Router)();
router.options("/", (req, res) => {
    res.sendStatus(200);
});
router.post("/", estateInfoController_1.estateInfoController.handleEstateInfo);
exports.default = router;

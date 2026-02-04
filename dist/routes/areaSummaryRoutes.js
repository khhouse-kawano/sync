"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const areaSuumaryController_1 = require("../controllers/areaSuumaryController");
const router = (0, express_1.Router)();
router.post("/", areaSuumaryController_1.areaSummaryController.handleAreaSummary);
exports.default = router;

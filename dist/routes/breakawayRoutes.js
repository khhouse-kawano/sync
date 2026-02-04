"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const breakawayController_1 = require("../controllers/breakawayController");
const router = (0, express_1.Router)();
router.post("/", breakawayController_1.breakawayController.handleBreakaway);
exports.default = router;

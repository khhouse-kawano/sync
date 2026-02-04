"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const weekdayController_1 = require("../controllers/weekdayController");
const router = (0, express_1.Router)();
router.post("/", weekdayController_1.weekdayController.handleWeekday);
exports.default = router;

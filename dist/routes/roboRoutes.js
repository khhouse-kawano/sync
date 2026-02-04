"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roboController_1 = require("../controllers/roboController");
const router = (0, express_1.Router)();
router.post("/", roboController_1.roboController.handleRobo);
exports.default = router;

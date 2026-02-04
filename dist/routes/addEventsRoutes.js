"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const addEventController_1 = require("../controllers/addEventController");
const router = (0, express_1.Router)();
router.post("/", addEventController_1.addEventController.handleAddEvent);
exports.default = router;

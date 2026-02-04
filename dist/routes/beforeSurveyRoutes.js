"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const beforeSurveyController_1 = require("../controllers/beforeSurveyController");
const router = (0, express_1.Router)();
router.post("/", beforeSurveyController_1.beforeSurveyController.handleBeforeSurvey);
exports.default = router;

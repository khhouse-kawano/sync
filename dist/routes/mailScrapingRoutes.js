"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mailScrapingController_1 = require("../controllers/mailScrapingController");
const router = (0, express_1.Router)();
router.post("/", mailScrapingController_1.mailScrapingController.handleMailScraping);
exports.default = router;

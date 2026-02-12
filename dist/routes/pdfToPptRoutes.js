"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pdfToPptController_1 = require("../controllers/pdfToPptController");
const router = (0, express_1.Router)();
router.post("/", pdfToPptController_1.pdfToPptController.handlePdfToPptController);
exports.default = router;

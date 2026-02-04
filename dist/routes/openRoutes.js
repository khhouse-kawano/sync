"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const openController_1 = require("../controllers/openController");
const router = (0, express_1.Router)();
router.get("/open", openController_1.openController.handleOpen);
exports.default = router;

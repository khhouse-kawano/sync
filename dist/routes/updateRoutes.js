"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const updateController_1 = require("../controllers/updateController");
const router = (0, express_1.Router)();
router.post("/", updateController_1.updateController.handleUpdate);
exports.default = router;

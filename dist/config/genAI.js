"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genAI = void 0;
const generative_ai_1 = require("@google/generative-ai");
exports.genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

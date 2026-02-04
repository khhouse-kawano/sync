"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/env");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const indexRoutes_1 = __importDefault(require("./routes/indexRoutes"));
const updateRoutes_1 = __importDefault(require("./routes/updateRoutes"));
const roboRoutes_1 = __importDefault(require("./routes/roboRoutes"));
const beforeSurveyRoutes_1 = __importDefault(require("./routes/beforeSurveyRoutes"));
const openRoutes_1 = __importDefault(require("./routes/openRoutes"));
const addEventsRoutes_1 = __importDefault(require("./routes/addEventsRoutes"));
const breakawayRoutes_1 = __importDefault(require("./routes/breakawayRoutes"));
const weekdayRoutes_1 = __importDefault(require("./routes/weekdayRoutes"));
const summaryRoutes_1 = __importDefault(require("./routes/summaryRoutes"));
const areaSummaryRoutes_1 = __importDefault(require("./routes/areaSummaryRoutes"));
const mailScrapingRoutes_1 = __importDefault(require("./routes/mailScrapingRoutes"));
const app = (0, express_1.default)();
// 1. 設定を共通化する
const corsOptions = {
    origin: "https://khg-marketing.info", // ローカル開発時はここを調整する必要があります
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};
// 2. メインのCORSミドルウェアに適用
app.use((0, cors_1.default)(corsOptions));
// 3. OPTIONS（プリフライト）にも「同じ設定」を適用
// ここで cors() を空にせず、corsOptions を渡します
app.options("*", (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.text());
app.use("/api/update", updateRoutes_1.default);
app.use("/api/robo", roboRoutes_1.default);
app.use("/api/before_survey", beforeSurveyRoutes_1.default);
app.use("/", openRoutes_1.default);
app.use("/api/add_event", addEventsRoutes_1.default);
app.use("/api/breakaway", breakawayRoutes_1.default);
app.use("/api/weekday", weekdayRoutes_1.default);
app.use("/api/summary", summaryRoutes_1.default);
app.use("/api/areasummary", areaSummaryRoutes_1.default);
app.use("/api/mail_scraping", mailScrapingRoutes_1.default);
app.use("/api/", indexRoutes_1.default);
exports.default = app;

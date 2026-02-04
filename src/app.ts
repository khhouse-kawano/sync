import "./config/env";
import express from "express";
import cors from "cors";
import indexRoutes from "./routes/indexRoutes";
import updateRoutes from "./routes/updateRoutes";
import roboRoutes from "./routes/roboRoutes";
import beforeSurveyRoutes from "./routes/beforeSurveyRoutes";
import openRoutes from "./routes/openRoutes";
import addEventRoutes from "./routes/addEventsRoutes";
import breakawayRoutes from "./routes/breakawayRoutes";
import weekdaysRoutes from "./routes/weekdayRoutes";
import summaryRoutes from "./routes/summaryRoutes";
import areaSummaryRoutes from "./routes/areaSummaryRoutes";
import mailScrapingRoutes from "./routes/mailScrapingRoutes";

const app = express();
// 1. 設定を共通化する
const corsOptions = {
    origin: "https://khg-marketing.info", // ローカル開発時はここを調整する必要があります
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};

// 2. メインのCORSミドルウェアに適用
app.use(cors(corsOptions));

// 3. OPTIONS（プリフライト）にも「同じ設定」を適用
// ここで cors() を空にせず、corsOptions を渡します
app.options("*", cors(corsOptions)); 

app.use(express.json());
app.use(express.text());

app.use("/api/update", updateRoutes);
app.use("/api/robo", roboRoutes);
app.use("/api/before_survey", beforeSurveyRoutes);
app.use("/", openRoutes);
app.use("/api/add_event", addEventRoutes);
app.use("/api/breakaway", breakawayRoutes);
app.use("/api/weekday", weekdaysRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/areasummary", areaSummaryRoutes);
app.use("/api/mail_scraping", mailScrapingRoutes);
app.use("/api/", indexRoutes);

export default app;

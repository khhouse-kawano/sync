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
import pdfToTtpRoutes from "./routes/pdfToPptRoutes";
import estateInfoRoutes from "./routes/estateInfoRoutes";
import portalKaeruRoutes from "./routes/portalKaeruRoutes";

const app = express();  
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

app.use("/api/", indexRoutes);
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
app.use("/api/pdftoppt", pdfToTtpRoutes);
app.use("/api/estate_info", estateInfoRoutes);
app.use("/api/portal_kaeru", portalKaeruRoutes);

export default app;

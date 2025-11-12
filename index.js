const express = require("express");
const { chromium } = require("playwright-chromium");
require("dotenv").config();
const { google } = require("googleapis");
const cors = require("cors");
const axios = require("axios");
const idList = require("./idList.js");
const runDataRegistration = require("./runDataRegistration.js");
const runDataRegistrationBeforeInterview = require("./runDataRegistrationBeforeInterview.js");
const runDataUpdate = require("./runDataUpdate.js");
const runDataUpdateBeforeInterview = require("./runDataUpdateBeforeInterview.js");
const runDataUpdateAfterInterview = require("./runDataUpdateAfterInterview.js");
const runMyHomeRobo = require("./runMyHomeRobo.js");
const runBeforeSurvey = require("./runBeforeSurvey.js");
const runDataUpdateNew = require("./runDataUpdateNew.js");
const runCallResale = require("./runCallResale.js");

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

const today = new Date();
const formattedDate = today.toISOString();

app.post("/", async (req, res) => {
  console.log(`${formattedDate}_同期処理受付開始`);
  const registerData = req.body;
  let shopValue;
  if (registerData.shop.includes("PGH")) {
    shopValue = "PG HOUSE宮崎店";
  } else if (registerData.shop.includes("2L")) {
    shopValue = "2L鹿児島店";
  } else {
    shopValue = registerData.shop;
  }

  const selectedShop = idList.find((item) => item.shop === shopValue);

  const pg_mail = selectedShop ? selectedShop.mail : null;
  const pg_pass = "4081Marketing";

  res.send({
    message: `${formattedDate}_同期処理を開始しました`,
    status: "processing",
  });

  let brand;
  if (shopValue.slice(0, 2) === "KH") {
    brand = "国分ハウジング";
  } else if (shopValue.slice(0, 3) === "DJH") {
    brand = "デイジャストハウス";
  } else if (shopValue.slice(0, 3) === "なごみ") {
    brand = "なごみ工務店";
  } else if (shopValue.slice(0, 2) === "2L") {
    brand = "ニーエルホーム";
  } else if (shopValue.slice(0, 2) === "FH") {
    brand = "フルコミホーム";
  } else if (shopValue.slice(0, 2) === "PG") {
    brand = "PG HOUSE";
  } else if (shopValue.slice(0, 2) === "JH") {
    brand = "ジャスフィーホーム";
  }

  if (registerData.request && registerData.request === "before_interview") {
    process.nextTick(() =>
      runDataRegistrationBeforeInterview(registerData, brand, pg_mail, pg_pass)
    );
  } else {
    process.nextTick(() =>
      runDataRegistration(registerData, brand, pg_mail, pg_pass)
    );
  }
});

app.post("/api/update", async (req, res) => {
  console.log(`${formattedDate}_アップデート処理受付開始`);
  const updateData = req.body;
  let shopValue;
  if (updateData.shop) {
    if (updateData.shop.includes("PGH")) {
      shopValue = "PG HOUSE宮崎店";
    } else if (updateData.shop.includes("2L")) {
      shopValue = "2L鹿児島店";
    } else {
      shopValue = updateData.shop;
    }
  }
  if (updateData.in_charge_store) {
    if (updateData.in_charge_store.includes("PGH")) {
      shopValue = "PG HOUSE宮崎店";
    } else if (updateData.in_charge_store.includes("2L")) {
      shopValue = "2L鹿児島店";
    } else {
      shopValue = updateData.in_charge_store;
    }
  }

  const selectedShop = idList.find((item) => item.shop === shopValue);

  const pg_mail = selectedShop ? selectedShop.mail : null;
  const pg_pass = "4081Marketing";

  res.send({
    message: `${formattedDate}_アップデートを開始しました`,
    status: "processing",
  });

  let brand;
  if (shopValue.slice(0, 2) === "KH") {
    brand = "国分ハウジング";
  } else if (shopValue.slice(0, 3) === "DJH") {
    brand = "デイジャストハウス";
  } else if (shopValue.slice(0, 3) === "なごみ") {
    brand = "なごみ工務店";
  } else if (shopValue.slice(0, 2) === "2L") {
    brand = "ニーエルホーム";
  } else if (shopValue.slice(0, 2) === "FH") {
    brand = "フルコミホーム";
  } else if (shopValue.slice(0, 2) === "PG") {
    brand = "PG HOUSE";
  } else if (shopValue.slice(0, 2) === "JH") {
    brand = "ジャスフィーホーム";
  }

  if (updateData.request && updateData.request === "before_interview") {
    process.nextTick(() =>
      runDataUpdateBeforeInterview(updateData, brand, pg_mail, pg_pass)
    );
  } else if (updateData.request && updateData.request === "after_interview") {
    process.nextTick(() =>
      runDataUpdateAfterInterview(updateData, brand, pg_mail, pg_pass)
    );
  } else if (
    updateData.request &&
    updateData.request === "before_interview_zero"
  ) {
    process.nextTick(() =>
      runDataUpdateNew(updateData, brand, pg_mail, pg_pass)
    );
  } else {
    process.nextTick(() => runDataUpdate(updateData, brand, pg_mail, pg_pass));
  }
});

app.post("/api/robo", async (req, res) => {
  console.log(`${formattedDate}_マイホームロボ連携開始`);
  const updateData = req.body;

  const robo_id = "shinji.kawano";
  const robo_pass = "4081kawano";

  res.send({
    message: `${formattedDate}_アップデートを開始しました`,
    status: "processing",
  });

  process.nextTick(() => runMyHomeRobo(updateData, robo_id, robo_pass));
});

app.post("/api/before_survey", async (req, res) => {
  console.log(`${formattedDate}_アップデート処理受付開始`);
  const updateData = req.body;
  const shopValue = updateData.shop.includes("PGH")
    ? "PG HOUSE宮崎店"
    : updateData.shop;

  const selectedShop = idList.find((item) => item.shop === shopValue);

  const pg_mail = selectedShop ? selectedShop.mail : null;
  const pg_pass = "4081Marketing";

  res.send({
    message: `${formattedDate}_アップデートを開始しました`,
    status: "processing",
  });

  process.nextTick(() =>
    runBeforeSurvey(updateData, shopValue, pg_mail, pg_pass)
  );
});

app.get("/open", async (req, res) => {
  const userId = req.query.id;
  const now = new Date();

  console.log(`Opened by ${userId} at ${now}`);

  // POSTするデータ
  const postData = {
    demand: "open_myhomerobo_mail",
    id: userId,
    ua: req.headers["user-agent"],
    ip: req.ip,
  };

  try {
    const headers = {
      Authorization: "4081Kokubu",
      "Content-Type": "application/json",
    };

    await axios.post("https://khg-marketing.info/dashboard/api/", postData, {
      headers,
    });

    console.log("開封ログ送信: 成功");
  } catch (error) {
    if (error.response) {
      console.error("APIエラー:", error.response.status, error.response.data);
    } else {
      console.error("通信エラー:", error.message);
    }
  }

  // 1x1透明PNG
  const img = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgX9nX9sAAAAASUVORK5CYII=",
    "base64"
  );

  res.writeHead(200, {
    "Content-Type": "image/png",
    "Content-Length": img.length,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });

  res.end(img);
});

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

app.post("/api/add_event", async (req, res) => {
  console.log(`${formattedDate}_カレンダー処理開始`);
  try {
    const { name, startTime, endTime, detail } = req.body;

    const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

    const event = {
      summary: `${name}様 架電対応`,
      description: detail,
      start: {
        dateTime: startTime,
        timeZone: "Asia/Tokyo",
      },
      end: {
        dateTime: endTime,
        timeZone: "Asia/Tokyo",
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    res.json({
      message: "イベント作成成功",
      eventLink: response.data.htmlLink,
    });
  } catch (error) {
    console.error(
      "Google Calendar API エラー:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "イベント作成に失敗しました" });
  }
});

app.post("/api/resale_ielove", async (req, res) => {
  console.log(`${formattedDate}_いえラブのアップデート処理受付開始`);

  const updateData = req.body;
  const mail = "shinji.kawano@kh-group.jp";
  const pass = "4081kokubukun";

  res.send({
    message: `${formattedDate}_いえラブのアップデートを開始しました`,
    status: "processing",
  });

  process.nextTick(() => runCallResale(updateData, mail, pass));
});

app.post("/api/breakaway", async (req, res) => {
  console.log("フォーム離脱情報の登録開始");
  const postData = req.body;
  res.send({
    message: `${formattedDate}_フォーム離脱情報の登録を開始しました`,
    status: "processing",
  });

  const data = { postData, demand: 'breakaway'}

  try {
    const headers = { Authorization: '4081Kokubu', 'Content-Type': 'application/json' };
    const response = await axios.post("https://khg-marketing.info/dashboard/api/", data, { headers });
    console.log(response.data);
  } catch (error) {
    console.error("エラー:", error);
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

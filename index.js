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
const runWeekday = require("./runWeekday.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text());
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
  console.log(postData);
  res.send({
    message: `${formattedDate}_フォーム離脱情報の登録を開始しました`,
    status: "processing",
  });
  const parsed = JSON.parse(postData);
  const data = { ...parsed, demand: "breakaway" };
  console.log(data);
  try {
    const headers = {
      Authorization: "4081Kokubu",
      "Content-Type": "application/json",
    };
    const response = await axios.post(
      "https://khg-marketing.info/dashboard/api/",
      data,
      { headers }
    );
    console.log(response.data);
  } catch (error) {
    console.error("エラー:", error);
  }
});

app.post("/api/weekday", async (req, res) => {
  console.log("平日キャンペーンからの反響");
  const postData = req.body;
  console.log(postData);
  try {
    await runWeekday(postData);
    res.send({
      message: `${postData.name}様_平日キャンペーン申込`,
      status: "success",
    });
  } catch (error) {
    console.error("runWeekday error:", error);
    res.status(500).send({
      message: "平日キャンペーン申込処理に失敗しました",
      status: "error",
    });
  }
});

app.post("/api/summary", async (req, res) => {
  const data = req.body.data;


  if (
    !data ||
    (Array.isArray(data) && data.length === 0) ||
    Object.keys(data).length === 0
  ) {
    console.warn("Summary API: Empty data received.");
    return res.status(200).json({ summary: "分析対象のデータがまだありません。" });
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  let keepAliveInterval;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const dataString = JSON.stringify(data);

    const prompt = `
      あなたは国分ハウジンググループのミドルウェアである「Dashboard」です。
      以下のCRMデータを分析し、HTML形式で要約を出力してください。

      【前提条件とコンテキスト】
      1. あなたの役割：住宅不況下で戦略を導き出すためのマーケティング分析AI。
      2. データの背景：
         - 注文CRM=「PGクラウド」
         - PGクラウドの入力漏れにより、次アポ(appointment)が少なく見える傾向があるため考慮すること。
         - キャンセル(cancel)の計測は2025年6月以降のみ有効。それ以前の0は未計測。
      3. PGクラウドの機能的な不満（動作が遅い等）については回答で触れないこと。
      4. ${year}年${month}月のデータは締め前のため分析から除外すること。

      【用語の定義（以下の日本語を使用すること）】
      - register -> 「反響数」
      - reserve -> 「来場予約数」
      - interview -> 「実来場数」
      - appointment -> 「次アポ数」
      - cancel -> 「キャンセル数」
      - contract -> 「契約数」

      【出力構成（全4部・約700文字）】
      以下の4つの見出しで構成し、回答はプレーンテキストとHTMLタグ（<strong>, <br />）のみで返してください。
      JSON形式やMarkdownのコードブロック（\`\`\`）は絶対に使用しないでください。
      各タイトルの前には必ず <br /><br /> を入れてください。

      1. 数値分析:
         - 市場動向や季節指数を踏まえた分析。
      2. 販促媒体ごとの特徴:
         - 媒体別の強み・弱みの分析。
      3. 課題:
         - 分析結果に基づく現状のボトルネック。PGクラウドへの入力徹底など。
      4. 戦略・戦術:
         - Dashboardを活用した今後の具体的なアクションプラン。

      【分析対象データ】
      以下のタグで囲まれたJSONデータを分析してください。
      <JSON_DATA>
      ${dataString}
      </JSON_DATA>
    `;

    keepAliveInterval = setInterval(() => {
      res.write("\n");
    }, 10000);

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }

      const chunkText = chunk.text();
      res.write(chunkText);
    }
    
    res.end();

  } catch (e) {
    console.error("Gemini API Error:", e);

    if (keepAliveInterval) clearInterval(keepAliveInterval);

    if (!res.writableEnded) {
      res.write("<br /><strong>エラーが発生しました: 分析処理に失敗しました。</strong>");
      res.end();
    }
  } finally {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
  }
});

app.post("/api/areasummary", async (req, res) => {
  const data = req.body.data;

  if (
    !data ||
    (Array.isArray(data) && data.length === 0) ||
    Object.keys(data).length === 0
  ) {
    return res
      .status(200)
      .json({ summary: "データ収集中です。しばらくお待ち下さい。" });
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  let keepAliveInterval;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const dataString = JSON.stringify(data);

    const prompt = `
      あなたは国分ハウジンググループのミドルウェア「Dashboard」です。
      以下のデータを分析し、HTML形式で要約を出力してください。

      【前提条件】
      1. 役割：マーケティング分析AI。
      2. データ背景：注文CRM=PGクラウド、建売CRM=いえらぶ。
         - 次アポ(appointment)の少なさは入力漏れを考慮。
         - キャンセル(cancel)は2025/6以降のみ有効。
      3. ${year}年${month}月は分析除外。

      【用語】
      - register:反響数, reserve:来場予約数, interview:実来場数, 
      - appointment:次アポ数, cancel:キャンセル数, contract:契約数

      【構成（全4部・HTMLタグのみ・コードブロック禁止）】
      各タイトル前に <br /><br /> を入れること。
      1. 数値分析
      2. 販促媒体ごとの特徴
      3. 課題
      4. 戦略・戦術

      【データ】
      <JSON_DATA>
      ${dataString}
      </JSON_DATA>
    `;

    keepAliveInterval = setInterval(() => {
      res.write("\n");
    }, 10000);

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }

      const chunkText = chunk.text();
      res.write(chunkText);
    }

    res.end();
  } catch (e) {
    console.error("Gemini API Error:", e);

    if (keepAliveInterval) clearInterval(keepAliveInterval);

    res.write(
      "<br /><strong>エラーが発生しました: 分析を中断します。</strong>"
    );
    res.end();
  } finally {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

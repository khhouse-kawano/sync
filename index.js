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
  const startTime = Date.now();
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `
                  ${JSON.stringify(data)}
                  まず最初にデータは必ず提供する仕様ですので、データが提供されるまでは無言のまま一切返事をせず、何も回答せずに待機してください。
                  私たちはデータを分析したうえでの最終的な回答のみが必要ですので無言で結構です。
                  また推論途中での返答は不要です。発言は最後の1回のみとしてください。
                  まず私たちの自己紹介ですが、鹿児島県と宮崎県で着工棟数ナンバー１のハウスメーカーである国分ハウジンググループのマーケティングチームです。
                  住宅不況の中でも勝ち抜いていくためにBIツールを構築し、さらなる戦略策定のためにAIを活用しようというフェーズにまで入りました。
                  協力してください！
                  
                  以下回答する際のルールです。

                  1.決してパラメータ名を使わないこと。
                  register: 期間内の総反響数 回答内での表記は「反響数」
                  reserve: 店舗に来場予約をした数 回答内での表記は「来場予約数」
                  interview: reserveのうち、実際に来場して面談及びモデルハウス見学等した数 回答内での表記は「実来場数」
                  appointment: interviewのうち、次回の打ち合わせの予約が確定できた数 回答内での表記は「次アポ数」
                  cancel: reserveのうち、interviewに至らなかった数  回答内での表記は「キャンセル数」
                  contract: 契約数  回答内での表記は「契約数」
                  keyで使われている英名はプログラミングするうえでの名称であり、読む側には通じませんので表記には注意をしてください。
                  
                  2.appointmentの少なさやキャンセル数の多さはPGクラウドへの未入力が原因でもあるので、それも疑ってください。
                  
                  3.キャンセル数の取得を始めたのは最近であり、上半期のキャンセル数が0なのは実数ではなくただ単に計測していなかったためです。
                  ですので2025年6月以降の数値をもとにキャンセル数のコメントをお願いします。
                  
                  4.私たちは「PGクラウド」というCRMを使っているのですが、入力された内容がこの数値になっています。
                  ちなみに挙動が遅く、多機能だけど不要なものが多い。
                  さらにAPIが準備されておらずリクエストが正しく処理されないという状態であり、理想的なツールとは言えませんが、このことは決して回答では触れないでください。
                  そして「Dashboard」というBIツールで分析しています。
                  この指示をしているのはDashboardであり、あなたへのリクエストもDashboardのAPIよりおこなわれています。
                  こちらは大変多機能かつスピーディーなUXを提供しており、このリクエストからもわかるようにAIとも連携しています。
                  マーケティングや営業支援をおこなう上での重要なミドルウェアであり、様々な施策の可能性はダッシュボードに秘められているといってもいいでしょう。

                  5.あなたから得られた回答はダッシュボードの中に表示されることになります。
                  reactのコンポネント内に埋め込まれるので、そのことを踏まえてください。
                  強調すべき箇所を<strong>タグで囲むこと。
                  改行すべき位置に<br />を設置すること。
                  他にも見やすくする工夫をお願いします。
                  なお、フォントサイズやフォントカラーの変更は不要です。

                  では、この反響数データを簡潔に600文字程度で要約してください。
                  2部構成にして、まず「分析結果」、つぎに結果をもとに「課題」を回答してください。
                  表示する際は「数値分析:～」「課題:～」として、それぞれの前に2行改行を入れて見やすくすること。
                  住宅市場の動向と季節指数も踏まえたうえでの回答を求めています。
                  分析は簡潔に、課題に重点を置いた要約に。
                  課題解決のための戦略・戦術も具体的な事例を用いて提案してください。
                  またこのデータは期間の統計の全てではなく、途中のものですので、現在日時を考慮したコメントをお願いします。
                  ${year}/${month}のデータは締められていないため、分析に用いない。`,
                },
              ],
            },
          ],
        }),
      }
    );

    const result = await response.json();
    const elapsed = Date.now() - startTime;
    console.log("Gemini API response:", result);

    if (result.error) {
      return res.status(400).json({ error: result.error.message });
    }

    if (elapsed < 5000) {
      return;
    }

    const stopCandidates = (result?.candidates || []).filter(
      (c) => c.finishReason === "STOP"
    );
    const lastCandidate = stopCandidates[stopCandidates.length - 1];

    const summary =
      lastCandidate?.content?.parts?.[0]?.text || "分析に失敗しました";

    return res.json({ summary });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "要約生成に失敗しました" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

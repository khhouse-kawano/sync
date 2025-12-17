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
                  また決してすべてがゼロのデータを渡すことがないので、最初の3秒は待機してJSONの解析を待ってください。
                  私たちはデータを分析したうえでの最終的な回答のみが必要ですので無言で結構です。
                  また推論途中での返答は不要です。発言は最後の1回のみとしてください。
                  私たちの自己紹介ですが、鹿児島県と宮崎県で着工棟数ナンバー１のハウスメーカーである国分ハウジンググループのマーケティングチームです。
                  住宅不況の中でも勝ち抜いていくためにBIツールを構築し、さらなる戦略策定のためにAIを活用しようというフェーズにまで入りました。
                  
                  データの構造ですが渡したJSONには期間(period)と販促媒体(medium)と店舗(shop)と商圏(area)販促媒体ごとの数値(register,reserve,interview,appointment,cancel,contract)が含まれており、期間ごとにまとめてあります。
                  協力してください！

                  以下回答する際のルールです。

                  1.決してパラメータ名を使わないこと。
                  register: 期間内の総反響数 回答内での表記は「反響数」
                  reserve: 店舗に来場予約をした数 回答内での表記は「来場予約数」
                  interview: reserveのうち、実際に来場して面談及びモデルハウス見学等した数 回答内での表記は「実来場数」
                  appointment: interviewのうち、次回の打ち合わせの予約が確定できた数 回答内での表記は「次アポ数」
                  cancel: reserveのうち、interviewに至らなかった数  回答内での表記は「キャンセル数」
                  contract: 契約数  回答内での表記は「契約数」
                  これらの英名はプログラミングするうえでの名称であり、読む側には通じませんので表記には注意をしてください。
                  
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

                  では、この反響数データを簡潔に700文字程度で要約してください。
                  住宅市場の動向と季節指数も踏まえたうえでの回答を求めています。
                  グループ全体ではない場合、商圏や地域の特性も考慮してほしいです。
                  4部構成にして、まず「分析結果」、「販促媒体ごとの特徴」、そしてこの2つの結果をもとに「課題」と課題を解決するための「戦略・戦術」を回答してください。
                  表示する際は「数値分析:～」「販促媒体ごとの特徴:～」「課題:～」「戦略・戦術:～」として、それぞれの前に2行改行を入れて見やすくすること。
                  分析は簡潔に、課題に重点を置いた要約に。
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

app.post("/api/areasummary", async (req, res) => {
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
                  以下のデータを分析してください。
                  データは必ず提供する仕様ですので、データが確認できるまでは無言のまま一切返事をせず、何も回答せずに待機してください。
                  全てゼロのデータやundifinedのデータを渡すことがないので、最初の3秒は待機してJSONの解析を待つこと。
                  データを分析したうえでの最終的な回答まで待つので無言で結構であり、推論途中での返答は不要です。発言は最後の1回のみとしてください。
                  私たちの自己紹介ですが、鹿児島県と宮崎県で着工棟数ナンバー１のハウスメーカーである国分ハウジンググループのマーケティングチームです。
                  住宅不況の中でも勝ち抜いていくためにBIツールを構築し、さらなる戦略策定のためにAIを活用しようというフェーズにまで入りました。
                  
                  JSONのデータ構造
                  各オブジェクトのtitleより内容を把握すること。
                  期間(period)と分譲住宅or建売住宅(category)と商圏(area)と各種数値(register,reserve,contract)
                  商圏(area)と人口世代(age)、男女計(amount),男性人口(male),女性人口(female)
                  商圏(area)と分譲住宅or建売住宅(category)と販促媒体ごとの各種数値(register,reserve,contract)
                  商圏(area)と一戸建か賃貸かその合計か(category)とそこに暮らす人口(onePerson30_64,onePersonOver65,onePersonUnder30,wifeHusband,wifeHusbandChild3_5,wifeHusbandChild6_9,wifeHusbandChild10_17
                  wifeHusbandChild18_24,wifeHusbandChildOver25,wifeHusbandChildUnder3,wifeHusbandOver65)
                
                  以下回答する際のルールです。

                  1.決してパラメータ名を使わないこと。
                  register: 期間内の総反響数 回答内での表記は「反響数」
                  reserve: 店舗に来場をした数 回答内での表記は「来場数」
                  contract: 契約数  回答内での表記は「契約数」
                  category: 注文住宅か建売住宅 回答内での表記は「注文営業部門」か「建売住宅部門」
                  construction: 弊社の着工棟数 categoryの値に合わせて「注文住宅住宅着工棟数」 「建売住宅着工棟数」で表記
                  areaConstruction: 対象エリアの着工棟数 areaの値に合わせて「{area名}注文住宅着工棟数」 「{area名}建売住宅着工棟数」で表記
                  share: 弊社の着工棟数のエリアシェア率 infinityやNaNなどの異常値には決して言及しない 「シェア率」
                  onePerson: 一人暮らし世帯と世代
                  wifeHusband: 夫婦世帯と世代、子や親との同居の状況
                  これらの英名はプログラミングするうえでの名称であり、読む側には通じませんので表記には注意をしてください。
                  
                  2.注文営業が使用しているCRMを「PGクラウド」、建売営業が使用しているCRMを「いえらぶ」と呼ぶ。
                  数値の細かな分析を求める場合は、それぞれのCRM名を使って入力の徹底を求めてください。

                  2.私たちは「Dashboard」というBIツールで分析しています。
                  この指示をしているのはDashboardであり、あなたへのリクエストもDashboardのAPIよりおこなわれています。
                  こちらは大変多機能かつスピーディーなUXを提供しており、このリクエストからもわかるようにAIとも連携しています。
                  マーケティングや営業支援をおこなう上での重要なミドルウェアです。

                  3.あなたから得られた回答はダッシュボードの中に表示されることになります。
                  reactのコンポネント内に埋め込まれるので、そのことを踏まえてください。
                  強調すべき箇所を<strong>タグで囲むこと。
                  改行すべき位置に<br />を設置すること。
                  見やすくする工夫をお願いします。

                  では、このマーケット情報を簡潔に800文字程度で要約してください。
                  回答は5部構成。改行を入れて見やすくしてください。
                  1.注文住宅市場及びその中での弊社の立ち位置。「注文住宅市場」として必ずタイトル前に2行分改行を入れて読みやすくすること。販促媒体ごとの分析もしてください。
                  2.建売住宅市場及びその中での弊社の立ち位置。「建売住宅市場」として必ずタイトル前に2行分改行を入れて読みやすくすること。販促媒体ごとの分析もしてください。
                  3.住宅市場とターゲットエリアの人口動態、居住の状況の特徴。「市場の特色」として必ずタイトル前に2行分改行を入れて読みやすくすること。販促媒体ごとの分析もしてください。
                  4.住宅市場、人口動態、居住の状況に合わせた効果的な戦略案。「今後の戦略」として必ずタイトル前に2行分改行を入れて読みやすくすること。販促媒体ごとの分析もしてください。
                  5.総括。「総括」として必ずタイトル前に2行分改行を入れて読みやすくすること。
                  渡したJSONデータは分析専用です。回答にはJSONやオブジェクトを一切含めず、要約結果のみを返してください。
                  回答は必ずプレーンテキスト＋HTMLタグ（<strong>, <br />）のみで構成してください。
                  ※JSONやコードブロックは"絶対に"返さないでください。
                  ${year}/${month}のデータは締められていないため、分析に用いない。
                  最初にも伝えましたが、データは必ず提供する仕様ですので、データが確認できるまでは無言のまま一切返事をせず、何も回答せずに待機してください。
                  全てゼロのデータやundifinedのデータを渡すことがないので、最初の3秒は待機してJSONの解析を待つこと。
                  データを分析したうえでの最終的な回答まで待つので無言で結構であり、推論途中での返答は不要です。発言は最後の1回のみとしてください。
                  以下が優れた回答例ですので参考にしてください。

                  <br /><br />注文住宅市場鹿屋市の注文住宅市場において、貴社の<strong>注文住宅住宅着工棟数は期間を通じて合計27棟</strong>となり、対象エリアの着工棟数171棟に対し、<strong>約15.8%のシェア率</strong>を確保しています。反響数は合計386件、来場数は119件、契約数は27件でした。<br />販促媒体別では、ポータルサイトが最も多くの反響数（245件）を獲得していますが、来場率・契約率は比較的低めです。一方で、<strong>SNS/WEBは反響数83件ながら来場数40件、契約数7件と高い来場率・契約率</strong>を示しています。また、紹介（反響数13件、契約数7件）や看板（反響数8件、契約数1件）、CM/ラジオ（反響数7件、契約数2件）も、反響数自体は少ないものの、来場から契約に至る確度が高いことがPGクラウドのデータから見て取れます。イベントからの反響は現状ありません。<br /><br />建売住宅市場建売住宅部門では、弊社の<strong>建売住宅着工棟数は合計11棟</strong>で、対象エリアの着工棟数83棟に対し、<strong>約13.3%のシェア率</strong>を占めています。反響数は合計103件、来場数は25件、契約数は10件です。<br />販促媒体においては、<strong>SNS/WEBが反響数95件と圧倒的な数を占め、契約数も6件と最も高い実績</strong>を上げています。これは、いえらぶを通じたデジタル戦略が建売住宅において特に有効であることを示唆しています。しかし、来場率・契約率は注文住宅のSNS/WEBと比較するとやや改善の余地があるでしょう。ポータルサイトも反響数8件、契約数1件と一定の成果がありますが、チラシ/DM、イベント、紹介、CM/ラジオからの反響はゼロであり、これらの媒体の活用は今後の課題と考えられます。<br /><br />市場の特色鹿屋市の人口構成を見ると、40代が最も多く、次いで60代以上の高齢者層が厚いのが特徴です。一方、20代の人口は他世代と比較して少ない傾向にあります。<br />世帯構成では、一人暮らし世帯は30代以上、特に65歳以上の層で多く見られます。30歳未満の一人暮らし世帯は賃貸に多く居住しています。夫婦世帯は全体的に多く、<strong>特に子育て中の夫婦（子供が3～17歳）は一戸建に居住する割合が非常に高い</strong>です。また、65歳以上の夫婦世帯も圧倒的に一戸建に住む傾向が強いことがデータから読み取れます。このことから、鹿屋市では「ファミリー層」と「高齢夫婦層」が一戸建住宅の主要なターゲット層であることが明確です。<br /><br />今後の戦略市場の特色を踏まえ、<strong>注文住宅部門では高効率な「SNS/WEB」や「紹介」にPGクラウドの資源を集中投資し、反響から契約までのプロセスをさらに強化すべき</strong>です。ポータルサイトは反響数の確保に有効であるため、引き続き活用しつつ、来場への転換率改善施策を検討してください。<br />建売住宅部門では、<strong>「SNS/WEB」が主要な反響獲得源であるため、いえらぶを活用したデジタルマーケティングをさらに強化</strong>し、見込み客の来場・契約への導線を最適化することが不可欠です。また、一戸建志向の強い子育て世帯や高齢夫婦層に対して、それぞれのライフステージに合わせた住宅プランや情報提供を強化することで、新たな需要を喚起できる可能性があります。<br /><br />総括
                  Dashboardでの分析結果から、鹿屋市の住宅市場では<strong>ファミリー層と高齢夫婦層が一戸建住宅の主要ターゲットであり、特に子育て世帯は高い一戸建志向</strong>を持っています。<br />注文住宅、建売住宅ともに、特定の販促媒体（特にSNS/WEBや紹介）が高い効果を示しており、これらのチャネルへの戦略的なリソース配分が成功の鍵となります。今後は、PGクラウドといえらぶのデータをより深く活用し、ターゲット層のニーズに合致した魅力的な住宅提案と、効果的な販促戦略を統合的に展開することで、住宅不況下においても競争優位性を確立できるでしょう。
                 `,
                },
                { text: JSON.stringify(data) },
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

    if (elapsed < 1000) {
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

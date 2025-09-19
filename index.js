const express = require("express");
const { chromium } = require("playwright-chromium");
require("dotenv").config();
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
  if (updateData.shop.includes("PGH")) {
    shopValue = "PG HOUSE宮崎店";
  } else if (updateData.shop.includes("2L")) {
    shopValue = "2L鹿児島店";
  } else if (updateData.in_charge_store.includes("PGH")) {
    shopValue = "PG HOUSE宮崎店";
  } else if (updateData.in_charge_store.includes("2L")) {
    shopValue = "2L鹿児島店";
  } else if (updateData.shop) {
    shopValue = updateData.shop;
  } else if (updateData.in_charge_store) {
    shopValue = updateData.in_charge_store;
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

  const robo_id = "mr10238";
  const robo_pass = "1pq5wvQj";

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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

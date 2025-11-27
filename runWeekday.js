const { chromium } = require("playwright-chromium");
require("dotenv").config();
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");

const runWeekday = async (postData) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "shinji.kawano@kh-group.jp",
      pass: "bdrm wqln tlcr gwmq",
    },
  });

  const mailOptions = {
    from: '"平日来場キャンペーン" <mkt@kh-house.jp>',
    to: "mkt@kh-house.jp",
    cc: 'kh@kh-group.jp,lead@kh-group.jp,kh-t@kh-house.jp',
    subject: `${postData.shop}_平日来場キャンペーンからの反響`,
    text: `平日来場キャンペーンからの反響がありました。
    ====================
    お客様情報
    ====================
    エリア:${postData.area}
    ブランド:${postData.brand}
    店舗:${postData.shop}
    来場希望日:${postData.date}
    来場希望時間:${postData.time}
    お名前（漢字）:${postData.name}
    お名前（かな）:${postData.kana}
    携帯番号:${postData.phone}
    メールアドレス:${postData.mail}
    ====================
    ※内容を確認のうえ対応をお願いいたします。
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("反響メールを送信しました");
  } catch (err) {
    console.error("メール送信に失敗しました:", err);
  }
};

module.exports = runWeekday;

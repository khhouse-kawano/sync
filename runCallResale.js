const { chromium } = require("playwright-chromium");
require("dotenv").config();
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");

const errors = [];

const runCallResale = async (updateData, mail, pass) => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext();
  const page = await context.newPage();

  const login = async () => {
    try {
      await page.goto("https://cloud.ielove.jp/");
      await page.fill("#_4407f7df050aca29f5b0c2592fb48e60", mail);
      await page.fill("#_81fa5c7af7ae14682b577f42624eb1c0", pass);
      await page.click("#loginButton");
      await page.waitForLoadState("networkidle");
    } catch (err) {
      const msg = `ログインに失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }
  };

  const fillForm = async () => {
    try {
      await page.goto(`https://cloud.ielove.jp/kanricrm/customer/index/?freeword=${updateData.id}&groupId=150319&staff=&customerSearchFlg=1`);
      await page.waitForLoadState('load');
      await page.goto(`https://cloud.ielove.jp/kanricrm/customerdetail/?id=${updateData.id}&groupId=150319`);
      await page.waitForLoadState("load");
      await page.click("#sesshoku");
      await page.click(
        "//html/body/div[1]/div[6]/div/div[2]/div/form/div[2]/div[2]/div[8]/div/div[2]/div/p/a"
      );
    } catch (err) {
      const msg = `顧客ページ移動に失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }

    console.log(updateData);
    const formattedDate = updateData.data.date.replace(/-/g, "/");
    let hour = "";
    let minute = "";
    if (updateData.data.time) {
      [hour, minute] = updateData.data.time.split(":");
    }

    try {
      await page.waitForLoadState('load');
      await page.click("#supportDate");
      await page.click(`[data-day="${formattedDate}"]`);
      await page.selectOption("#supportHour", hour);
      await page.selectOption("#supportMinute", minute);
      await page.selectOption("#supportType", updateData.data.method);
      await page.selectOption("#createUserId", updateData.data.staff);
      await page.click('#Yes');
      await page.waitForLoadState('load');
      // await page.fill("#title", updateData.data.subject);
      await page.fill("//html/body/div[13]/div[2]/form/table/tbody/tr[4]/td/textarea", updateData.data.note);
    } catch (err) {
      const msg = `応対履歴入力に失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }

    try {
      await page.waitForLoadState('load');
      await page.click('#support_edit_button');
      await page.waitForLoadState('load');
      await page.waitForSelector('#w2ui-lock', { state: 'detached' });
      await page.click('#detail_button');
      console.log(updateData);
      console.log("応対履歴登録に成功");
    } catch (err) {
      const msg = `応対履歴保存に失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }

    try {
      await page.click("#detail_button");
    } catch (err) {
      const msg = `保存処理に失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }
  };

  try {
    await login();
    console.log("ログイン成功");
  } catch (err) {
    console.error("ログイン失敗:", err);
    return;
  }

  try {
    await fillForm();
    console.log("入力成功");
  } catch (err) {
    console.error("フォーム入力失敗:", err);
    return;
  }

  const now = new Date();
  const nowString = now.toDateString();
  console.log(`${nowString}_${updateData.id}_アップデート完了:`);

  await browser.close();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "shinji.kawano@kh-group.jp",
      pass: "bdrm wqln tlcr gwmq",
    },
  });

  if (errors.length > 0) {
    const mailOptions = {
      from: "error@khg-marketing.info",
      to: "shinji.kawano@kh-group.jp",
      subject: "【自動送信】データ更新作業中にエラー発生",
      text: `以下のエラーが発生しました:\nrunDataUpdateNew.js\nID:${
        updateData.id
      }\n${errors.join("\n")}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("エラーメールを送信しました");
    } catch (err) {
      console.error("メール送信に失敗しました:", err);
    }
  }
};

module.exports = runCallResale;

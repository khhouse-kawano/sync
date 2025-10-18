const { chromium } = require("playwright-chromium");
require("dotenv").config();
const cors = require("cors");
const axios = require("axios");

const errors = [];

const runDataUpdate = async (updateData, brand, pg_mail, pg_pass) => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext();
  const page = await context.newPage();

  const login = async () => {
    await page.goto("https://pg-cloud.cloud/login");
    await page.fill("#form_email", pg_mail);
    await page.fill("#form_password", pg_pass);
    await page.click("//html/body/main/div/form[1]/div/div[2]/input[2]");
    await page.waitForLoadState("networkidle");
  };

  const fillForm = async () => {
    const updateObject = {};
    await page.goto(`https://pg-cloud.cloud/customers/${updateData.id}/summary`);
    await page.waitForLoadState("networkidle");

    const safeFill = async (selector, value, label) => {
      if (!value) return;
      try {
        await page.fill(selector, String(value));
        updateObject[`${label}Content`] = await page
          .locator(selector)
          .inputValue();
      } catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    };

    const safeSelect = async (
      clickSelector,
      value,
      label,
      valueSelector = clickSelector
    ) => {
      if (!value) return;
      try {
        await page.click(clickSelector);
        await page.click(`div[data-label="${value}"]`);
        updateObject[`${label}Content`] = await page
          .locator(valueSelector)
          .getAttribute("data-label");
      } catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    };

    const safeStaffSelect = async (
      clickSelector,
      value,
      label,
      valueSelector = clickSelector
    ) => {
      if (!value) return;
      try {
        await page.click(clickSelector);
        await page.click(`div[data-value="${value}"]`);
        updateObject[`${label}Content`] = await page
          .locator(valueSelector)
          .getAttribute("data-label");
      } catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    };

    await page.click(
      "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/div[1]"
    );
    await page.click(`div[data-label="${brand}"]`);
    try {
      updateObject.brandContent = await page
        .locator(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/input"
        )
        .getAttribute("data-label");
    } catch (e) {
      console.warn("入力値失敗:", e);
    }

    if (updateData.medium) {
      let mediumValue;
      if (updateData.medium === "ALLGRIT") {
        mediumValue = "公式LINE";
      } else if (updateData.medium === "ホームページ反響") {
        mediumValue = "インターネット検索";
      } else {
        mediumValue = updateData.medium;
      }
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[2]/div/div/div[1]"
      );
      await page.click(`div[data-label="${mediumValue}"]`);
    }
    try {
      updateObject.mediumContent = await page
        .locator(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[2]/div/div/input"
        )
        .getAttribute("data-label");
    } catch (e) {
      console.warn("入力値失敗:", e);
    }

    if (updateData.staff) {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]"
      );
      await page.click(`div[data-value="${updateData.staff}"]`);
    }
    try {
      updateObject.staffContent = await page
        .locator(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input"
        )
        .getAttribute("data-label");
    } catch (e) {
      console.warn("入力値失敗:", e);
    }

    if (updateData.rank && updateData.rank !== "") {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[1]/div[2]/div/div[1]"
      );
      await page.click(`div[data-label="${updateData.rank}"]`);
    }
    try {
      updateObject.rankContent = await page
        .locator(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[1]/div[2]/div/input"
        )
        .getAttribute("data-label");
    } catch (e) {
      console.warn("入力値失敗:", e);
    }

    if (updateData.estate) {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[2]/div[2]/div/div[1]"
      );
      await page.click(`div[data-label="${updateData.estate}"]`);
    }
    try {
      updateObject.estateContent = await page
        .locator(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[2]/div[2]/div/input"
        )
        .getAttribute("data-label");
    } catch (e) {
      console.warn("入力値失敗:", e);
    }

    if (updateData.period && updateData.period !== "") {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[3]/div[2]/div/div[1]"
      );
      await page.click(`div[data-label="${updateData.period}"]`);
    }
    try {
      updateObject.periodContent = await page
        .locator(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[3]/div[2]/div/input"
        )
        .getAttribute("data-label");
    } catch (e) {
      console.warn("入力値失敗:", e);
    }

    if (updateData.importance && updateData.importance !== "") {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[5]/div[3]/div[2]/div/div[1]"
      );
      await page.click(`div[data-label="${updateData.importance}"]`);
    }
    try {
      updateObject.importanceContent = await page
        .locator(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[5]/div[3]/div[2]/div/input"
        )
        .getAttribute("data-label");
    } catch (e) {
      console.warn("入力値失敗:", e);
    }

    function toHalfWidthNumber(str) {
      return str.replace(/[０-９]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xfee0)
      );
    }

    const rawBudget = updateData.budget || "";
    const formattedBudget = toHalfWidthNumber(rawBudget)
      .replace(/,/g, "")
      .replace("万円", "");

    if (formattedBudget !== "") {
      await page.fill(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[8]/div[1]/div[2]/input",
        formattedBudget
      );
    }
    try {
      updateObject.budgetContent = await page
        .locator(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[8]/div[1]/div[2]/input"
        )
        .inputValue();
    } catch (e) {
      console.warn("入力値失敗:", e);
    }

    // if ( updateData.rival && updateData.rival !== '')  {
    //     await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[13]/div[2]/div[2]/textarea', updateData.rival);
    // } else {
    //     await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[13]/div[2]/div[2]/textarea', '');
    // }
    // try{
    //     updateObject.rivalContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[13]/div[2]/div[2]/textarea').inputValue();
    // } catch(e){
    //     console.warn('入力値失敗:',e);
    // }

    await page.click(
      "//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[1]"
    ); // ステップの入力

    // 名簿取得日を入力
    if (updateData.register && updateData.register !== "") {
      const formattedDate = updateData.register.replace(/\//g, "-");
      try {
        await page.fill("#calendar_item_0_start_at", formattedDate);
        updateObject.registerContent = await page
          .locator("#calendar_item_0_start_at")
          .inputValue();
      } catch (e) {
        console.warn("入力値失敗:", e);
      }
    }

    if (updateData.reserve && updateData.reserve !== "") {
      try {
        await page.fill("#calendar_item_2_start_at", updateData.reserve);
        updateObject.reserveContent = await page
          .locator("#calendar_item_2_start_at")
          .inputValue();
      } catch (e) {
        console.warn("入力値失敗:", e);
      }
    } else if (updateData.reserve === "") {
      await page.evaluate(() => {
        const el = document.getElementById("calendar_item_2_start_at");
        if (el) el.value = "";
      });
    }

    if (updateData.line_group && updateData.line_group !== "") {
      try {
        await page.fill("#calendar_item_3_start_at", updateData.line_group);
        updateObject.lineGroupContent = await page
          .locator("#calendar_item_3_start_at")
          .inputValue();
      } catch (e) {
        console.warn("入力値失敗:", e);
      }
    } else if (updateData.line_group === "") {
      await page.evaluate(() => {
        const el = document.getElementById("calendar_item_3_start_at");
        if (el) el.value = "";
      });
    }

    if (updateData.screening && updateData.screening !== "") {
      try {
        await page.fill("#calendar_item_5_start_at", updateData.screening);
        updateObject.screeningContent = await page
          .locator("#calendar_item_5_start_at")
          .inputValue();
      } catch (e) {
        console.warn("入力値失敗:", e);
      }
    } else if (updateData.screening === "") {
      await page.evaluate(() => {
        const el = document.getElementById("calendar_item_5_start_at");
        if (el) el.value = "";
      });
    }

    if (updateData.appointment && updateData.appointment !== "") {
      try {
        await page.fill("#calendar_item_8_start_at", updateData.appointment);
        updateObject.appointmentContent = await page
          .locator("#calendar_item_8_start_at")
          .inputValue();
      } catch (e) {
        console.warn("入力値失敗:", e);
      }
    } else if (updateData.appointment === "") {
      await page.evaluate(() => {
        const el = document.getElementById("calendar_item_8_start_at");
        if (el) el.value = "";
      });
    }

    await page.click(
      "//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[2]/div[2]/div[2]/button[1]"
    );

    // 面談後アンケート(memo)
    if (updateData.survey && updateData.survey !== "") {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]"
      );
      const current = await page.inputValue(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea"
      );
      const newNote = `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n面談後アンケート\n${updateData.survey}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n${current}`;
      await page.fill(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea",
        updateData.survey
      );
      try {
        updateObject.memoContent = await page
          .locator(
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea"
          )
          .inputValue();
      } catch (e) {
        console.warn("入力値失敗:", e);
      }
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
      );
    }

    // 商談メモ(備考)
    if (updateData.note && updateData.note !== "") {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[1]"
      );
      await page.fill(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[1]/textarea",
        updateData.note
      );
      try {
        updateObject.noteContent = await page
          .locator(
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[1]/textarea"
          )
          .inputValue();
      } catch (e) {
        console.warn("入力値失敗:", e);
      }
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[2]/button[1]"
      );
    }

    console.log(updateObject);

    const isVisible = await page
      .locator(
        "//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]"
      )
      .isVisible();
    console.log("ボタン表示状態:", isVisible);

    await page.click(
      "//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]"
    );
    await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
    await page.waitForLoadState("networkidle");
    const error = await page
      .locator("//html/body/main/div[1]/div[2]/div/form/div[3]/div[1]/span")
      .textContent();
    if (error) {
      console.log(error);
      if (error.includes("担当者")) {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]"
        );
        await page.click('div[data-value=""]');
        try {
          updateObject.staffContent = await page
            .locator(
              "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input"
            )
            .getAttribute("data-label");
        } catch (e) {
          console.warn("入力値失敗:", e);
        }
        console.log(updateObject);
      } else if (error.includes("メールアドレス")) {
        try {
          await page.click(
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]"
          );
          await page.fill("#customer_customer_contacts_attributes_0_email", "");
          await page.click(
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
          );
        } catch (e) {
          console.warn("入力値失敗:", e);
        }
      }
      const isVisible = await page
        .locator(
          "//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]"
        )
        .isVisible();
      console.log("ボタン表示状態:", isVisible);
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]"
      );
      await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
      await page.waitForLoadState("networkidle");
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
  console.log(`${nowString}_${updateData.staff}_アップデート完了:`);

  await browser.close();
};

module.exports = runDataUpdate;

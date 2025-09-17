const { chromium } = require("playwright-chromium");
require("dotenv").config();
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");
const errors = [];

const runDataRegistrationBeforeInterview = async (
  registerData,
  brand,
  pg_mail,
  pg_pass
) => {
  let pg_id;
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext();
  const page = await context.newPage();

  const login = async () => {
    await page.goto("https://pg-cloud.jp/login");
    await page.fill("#form_email", pg_mail);
    await page.fill("#form_password", pg_pass);
    await page.click("//html/body/main/div/form[1]/div/div[2]/input[2]");
    await page.waitForLoadState("networkidle");
  };

  const fillForm = async () => {
    const registerObject = {};

    await page.click("//html/body/main/div/div[2]/div[1]/div[2]/div[7]/a");
    await page.waitForLoadState("networkidle");

    const safeFill = async (selector, value, label) => {
      if (!value) return;
      try {
        await page.fill(selector, String(value));
        registerObject[`${label}Content`] = await page
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
        registerObject[`${label}Content`] = await page
          .locator(valueSelector)
          .getAttribute("data-label");
      } catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    };

    if (registerData.name) {
      await safeFill(
        "//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]",
        String(registerData.name),
        "name"
      );
    }

    if (registerData.kana) {
      await safeFill(
        "//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]",
        String(registerData.kana),
        "name"
      );
    }

    await safeSelect(
      "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/div[1]",
      brand,
      "brand",
      "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/input"
    );

    if (registerData.staff) {
      await safeSelect(
        "#in-charge-user-select",
        registerData.staff,
        "staff",
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input"
      );
    }

    try {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]"
      );
      if (registerData.mobile) {
        const mobileValue = registerData.mobile.replace(/=|"| /g, "").trim();
        if (mobileValue.charAt(0) === "0") {
          await safeFill(
            "#customer_customer_contacts_attributes_0_mobile_phone_number",
            String(mobileValue),
            "mobile"
          );
        }
      }
      if (registerData.mail.includes("@")) {
        await safeFill(
          "#customer_customer_contacts_attributes_0_email",
          String(registerData.mail),
          "mail"
        );
      }
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
      );
    } catch (err) {
      const msg = `連絡先の入力に失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }

    try {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[1]"
      );
    } catch (err) {
      const msg = `住所の入力に失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }

    const selectors = {
      zipInput: "#customer_postal_code",
      zipSearchBtn:
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[1]/div[2]/a",
      zipContent: "#customer_postal_code",
      prefContent:
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[2]/div[1]/div/div[1]/input",
      cityContent:
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[3]/div/div/div[1]/input",
      townContent:
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[4]/div/div/div[1]/input",
      streetInput: "#customer_address_detail",
      streetContent: "#customer_address_detail",
      buildingInput: "#customer_address_building",
    };

    const safeGetValue = async (
      selector,
      label,
      method = "inputValue",
      attrName
    ) => {
      try {
        if (method === "getAttribute") {
          return await page.locator(selector).getAttribute(attrName);
        } else {
          return await page.locator(selector)[method]();
        }
      } catch (err) {
        console.warn(`${label}取得失敗:`, err);
        errors.push(`${label}取得失敗: ${err}`);
        return "";
      }
    };
    if (registerData.zip) {
      const zipValue = registerData.zip.replaceAll("-", "");
      if (zipValue.length === 7) {
        await safeFill(selectors.zipInput, registerData.zip, "zip");
        await page.click(selectors.zipSearchBtn);
        await page.waitForTimeout(1500);

        registerObject.zipContent = await safeGetValue(
          selectors.zipContent,
          "zip"
        );
        registerObject.prefContent = await safeGetValue(
          selectors.prefContent,
          "pref",
          "getAttribute",
          "data-label"
        );
        registerObject.cityContent = await safeGetValue(
          selectors.cityContent,
          "city",
          "getAttribute",
          "data-label"
        );
        registerObject.townContent = await safeGetValue(
          selectors.townContent,
          "town",
          "getAttribute",
          "data-label"
        );
      }
    }

    const prefValue = await safeGetValue(
      selectors.prefContent,
      "pref",
      "getAttribute",
      "data-label"
    );
    const cityValue = await safeGetValue(
      selectors.cityContent,
      "city",
      "getAttribute",
      "data-label"
    );
    const townValue = await safeGetValue(
      selectors.townContent,
      "town",
      "getAttribute",
      "data-label"
    );

    if (registerData.street) {
      const streetValue = registerData.street
        .replaceAll(prefValue, "")
        .replaceAll(cityValue, "")
        .replaceAll(townValue, "");
      await safeFill(selectors.streetInput, streetValue, "street");
    }

    if (registerData.building) {
      const buildingValue = registerData.building
        .replaceAll(prefValue, "")
        .replaceAll(cityValue, "")
        .replaceAll(townValue, "");
      await safeFill(selectors.buildingInput, buildingValue, "building");
    }

    try {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
      );
    } catch (err) {
      const msg = `住所の入力に失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }

    // 名簿取得日を入力
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    try {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[1]"
      );
      if (registerData.date) {
        await safeFill("#calendar_item_0_start_at", formattedDate, "date");
      }
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[2]/div[2]/div[2]/button[1]"
      );
    } catch (err) {
      const msg = `商談ステップの入力に失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }

    // 建築動機
    if (registerData.interest || registerData.opportunity) {
      await safeFill(
        "#customer_house_hunting_motivation",
        `${String(registerData.interest)}${String(registerData.opportunity)}`,
        "interest"
      );
    }

    // 問合せのきっかけ
    if (registerData.medium) {
      await safeFill(
        "#customer_inquiry_reason",
        String(registerData.medium),
        "medium"
      );
    }

    // 予算総額
    if (registerData.budget) {
      await safeFill(
        "#customer_budget",
        registerData.budget
          ? String(registerData.budget).replace("万円", "")
          : "",
        "budget"
      );
    }

    // 現居契約形態
    if (registerData.situation) {
      await safeSelect(
        "#current-contract-type-select",
        registerData.situation,
        "situation",
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[2]/div[2]/div/div[1]/input"
      );
    }

    // 現居家賃
    if (registerData.rent) {
      await safeFill(
        "#customer_current_rent",
        registerData.rent ? String(registerData.rent).replace("万円", "") : "",
        "rent"
      );
    }

    // 年収・勤務先
    if (registerData.employment.name) {
      try {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[1]"
        );
        if (registerData.employment.type) {
          await safeSelect(
            "#customer_contacts_employment_type",
            registerData.employment.type,
            "employmentType",
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[1]/div[1]/div[2]/div/input"
          );
        }
        await safeFill(
          "#customer_customer_contacts_attributes_0_employer_name",
          registerData.employment.name,
          "employmentName"
        );
        if (registerData.employment.address) {
          await safeFill(
            "#customer_customer_contacts_attributes_0_employer_address",
            registerData.employment.address,
            "employmentAddress"
          );
        }
        if (registerData.employment.years) {
          await safeFill(
            "#customer_customer_contacts_attributes_0_years_of_service",
            registerData.employment.years,
            "employmentYears"
          );
        }
        if (registerData.employment.income) {
          await safeFill(
            "#customer_customer_contacts_attributes_0_annual_income",
            registerData.employment.income,
            "employmentIncome"
          );
        }
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
        );
      } catch (err) {
        const msg = `年収・勤務先の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    const familyMembers = [
      registerData.family_member_1,
      registerData.family_member_2,
      registerData.family_member_3,
      registerData.family_member_4,
    ];

    const baseXPath =
      "//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div";

    const hasAnyValue = (m) => m?.attribute || m?.name || m?.kana || m?.birth;

    try {
      if (hasAnyValue(familyMembers[0])) {
        await page.click(`${baseXPath}/div[1]`);
        await page.click(`${baseXPath}/div[2]/div[2]/div[1]/button`);
      }
      for (let i = 0; i < familyMembers.length; i++) {
        const member = familyMembers[i];
        if (!hasAnyValue(member)) continue;
        if (i > 0) {
          await page.click(`${baseXPath}/div[2]/div[2]/div[1]/button`);
        }
        const rowIndex = i + 1;
        if (member?.attribute) {
          await page.selectOption(
            `${baseXPath}/div[2]/div[2]/div[1]/div[2]/div[${rowIndex}]/div[1]/select`,
            member.attribute
          );
        }
        if (member?.name) {
          await page.fill(
            `${baseXPath}/div[2]/div[2]/div[1]/div[2]/div[${rowIndex}]/div[3]/input[1]`,
            member.name
          );
        }

        if (member?.kana) {
          await page.fill(
            `${baseXPath}/div[2]/div[2]/div[1]/div[2]/div[${rowIndex}]/div[4]/input[1]`,
            member.kana
          );
        }

        if (member?.birth) {
          await page.fill(
            `${baseXPath}/div[2]/div[2]/div[1]/div[2]/div[${rowIndex}]/div[5]/input`,
            member.birth
          );
        }
      }
      if (hasAnyValue(familyMembers[0])) {
        await page.click(`${baseXPath}/div[2]/div[2]/div[2]/button[1]`);
      }
    } catch (err) {
      const msg = `家族情報入力中にエラー: ${err}`;
      console.error(msg);
      errors.push(msg);
    }

    // 面談前アンケート(memo)
    if (registerData.survey && registerData.survey !== "") {
      try {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]"
        );
        const current =
          (await page.inputValue(
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea"
          )) ?? "";
        const newNote = `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n面談前アンケート\n${registerData.survey}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n${current}`;
        await safeFill(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea",
          newNote,
          "memo"
        );
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
        );
      } catch (err) {
        const msg = `アンケート（survey）の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    console.log(registerObject);
    const isVisible = await page
      .locator(
        "//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button"
      )
      .isVisible();
    console.log("ボタン表示状態:", isVisible);
    await page.click(
      "//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button"
    );
    await page.waitForTimeout(4500);
    await page.waitForLoadState("networkidle");
    const error = await page
      .locator("//html/body/main/div[1]/div[2]/div/form/div[3]/div[1]/span")
      .textContent();
    if (error) {
      console.log(error);
      if (error.includes("メールアドレス")) {
        try {
          await page.click(
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]"
          );
          await page.fill("#customer_customer_contacts_attributes_0_email", "");
          registerObject.mailContent = await page
            .locator("#customer_customer_contacts_attributes_0_email")
            .inputValue();
          await page.click(
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
          );
        } catch (e) {
          console.warn("入値失敗:", e);
        }
        console.log(registerObject);
      }
      if (error.includes("担当者")) {
        try {
          await page.click(
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]"
          );
          await page.click('div[data-value=""]');
          registerObject.staffContent = await page
            .locator(
              "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input"
            )
            .getAttribute("data-label");
        } catch (e) {
          console.warn("入力値失敗:", e);
        }
        console.log(registerObject);
      }
      const isVisible = await page
        .locator(
          "//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button"
        )
        .isVisible();
      console.log("ボタン表示状態:", isVisible);
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button"
      );
      await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
      await page.waitForLoadState("networkidle");
    }
    pg_id = await page.url();
    console.log(pg_id);
  };

  try {
    await login();
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
      subject: "【自動送信】エラー発生通知",
      text: `以下のエラーが発生しました:\n\n${errors.join("\n")}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("エラーメールを送信しました");
    } catch (err) {
      console.error("メール送信に失敗しました:", err);
    }
  }

  if (pg_id) {
    const now = new Date();
    const nowString = now.toDateString();
    const idValue = pg_id
      .replace("/edit", "")
      .replace("https://pg-cloud.jp/customers/", "");
    console.log(
      `${nowString}_${registerData.shop}_${registerData.firstName}_同期処理完了:`,
      url
    );

    const postData = {
      request: "before_interview_register",
      name: registerData.name,
      id: idValue,
      shop: registerData.shop,
    };

    console.log(postData);

    try {
      const headers = {
        Authorization: "4081Kokubu",
        "Content-Type": "application/json",
      };
      await axios.post("https://khg-marketing.info/survey/api/", postData, {
        headers,
      });
      console.log("POST完了");
    } catch (error) {
      console.error("エラー:", error);
    }
  }
};

module.exports = runDataRegistrationBeforeInterview;

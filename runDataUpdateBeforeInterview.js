const { chromium } = require("playwright-chromium");
require("dotenv").config();
const cors = require("cors");
const axios = require("axios");

const runDataUpdateBeforeInterview = async (
  updateData,
  brand,
  pg_mail,
  pg_pass
) => {
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
    const updateObject = {};
    await page.goto(`https://pg-cloud.jp/customers/${updateData.id}/summary`);
    await page.waitForLoadState("networkidle");

    const safeFill = async (selector, value, label) => {
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

    if (updateData.name) {
      await safeFill(
        "//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]",
        String(updateData.name),
        "name"
      );
    }

    if (updateData.kana) {
      await safeFill(
        "//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]",
        String(updateData.kana),
        "name"
      );
    }

    await safeSelect(
      "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/div[1]",
      brand,
      "brand",
      "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/input"
    );

    if (updateData.staff) {
      await safeStaffSelect(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]",
        updateData.staff,
        "staff",
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input"
      );
    }

    // 連絡先の入力
    try {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]"
      );
      if (updateData.mobile) {
        const mobileValue = updateData.mobile.replace(/=|"| /g, "").trim();
        if (mobileValue.charAt(0) === "0") {
          await safeFill(
            "#customer_customer_contacts_attributes_0_mobile_phone_number",
            String(mobileValue),
            "mobile"
          );
        }
      }
      if (updateData.mail?.includes("@")) {
        await safeFill(
          "#customer_customer_contacts_attributes_0_email",
          String(updateData.mail),
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

    // 住所の入力
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
    if (updateData.zip) {
      const zipValue = updateData.zip.replaceAll("-", "");
      if (zipValue.length === 7) {
        await safeFill(selectors.zipInput, updateData.zip, "zip");
        await page.click(selectors.zipSearchBtn);
        await page.waitForTimeout(1500);

        updateObject.zipContent = await safeGetValue(
          selectors.zipContent,
          "zip"
        );
        updateObject.prefContent = await safeGetValue(
          selectors.prefContent,
          "pref",
          "getAttribute",
          "value"
        );
        updateObject.cityContent = await safeGetValue(
          selectors.cityContent,
          "city",
          "getAttribute",
          "value"
        );
        updateObject.townContent = await safeGetValue(
          selectors.townContent,
          "town",
          "getAttribute",
          "value"
        );
      }
    }

    const prefValue = await safeGetValue(
      selectors.prefContent,
      "pref",
      "getAttribute",
      "value"
    );
    const cityValue = await safeGetValue(
      selectors.cityContent,
      "city",
      "getAttribute",
      "value"
    );
    const townValue = await safeGetValue(
      selectors.townContent,
      "town",
      "getAttribute",
      "value"
    );

    if (updateData.address) {
      const streetValue = updateData.address
        .replaceAll(prefValue, "")
        .replaceAll(cityValue, "")
        .replaceAll(townValue, "");
      await safeFill(selectors.streetInput, streetValue, "street");
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
      await safeFill("#calendar_item_0_start_at", formattedDate, "date");
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[2]/div[2]/div[2]/button[1]"
      );
    } catch (err) {
      const msg = `商談ステップの入力に失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }

    // 建築動機
    if (updateData.interest || updateData.opportunity) {
      await safeFill(
        "#customer_house_hunting_motivation",
        `${String(updateData.interest)},${String(updateData.opportunity)}`,
        "interest"
      );
    }

    // 建築予定地
    if (updateData.area) {
      await safeFill(
        "#customer_planned_construction_site",
        updateData.area,
        "area"
      );
    }

    // 問合せのきっかけ
    if (updateData.medium) {
      await safeFill(
        "#customer_inquiry_reason",
        String(updateData.medium),
        "medium"
      );
    }

    // 予算総額
    if (updateData.budget) {
      await safeFill(
        "#customer_budget",
        updateData.budget ? String(updateData.budget).replace("万円", "") : "0",
        "budget"
      );
    }

    // 現居契約形態
    if (updateData.situation) {
      await safeSelect(
        "#current-contract-type-select",
        updateData.situation,
        "situation",
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[2]/div[2]/div/div[1]/input"
      );
    }

    // 現居家賃
    if (updateData.rent) {
      await safeFill(
        "#customer_current_rent",
        updateData.rent ? String(updateData.rent).replace("万円", "") : "0",
        "rent"
      );
    }

    // 年収・勤務先
    if (updateData.employment.name) {
      try {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[1]"
        );
        if (updateData.employment.type) {
          await safeSelect(
            "#customer_contacts_employment_type",
            updateData.employment.type,
            "employmentType",
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[1]/div[1]/div[2]/div/input"
          );
        }
        await safeFill(
          "#customer_customer_contacts_attributes_0_employer_name",
          updateData.employment.name,
          "employmentName"
        );
        if (updateData.employment.address) {
          await safeFill(
            "#customer_customer_contacts_attributes_0_employer_address",
            updateData.employment.address,
            "employmentAddress"
          );
        }
        if (updateData.employment.years) {
          await safeFill(
            "#customer_customer_contacts_attributes_0_years_of_service",
            updateData.employment.years
              ? updateData.employment.years.replace("年", "")
              : "0",
            "employmentYears"
          );
        }
        if (updateData.employment.income) {
          await safeFill(
            "#customer_customer_contacts_attributes_0_annual_income",
            updateData.employment.income
              ? updateData.employment.income.replace("万円", "")
              : "0",
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

    // 家族情報の入力
    const familyMembers = [
      updateData.family_member_1,
      updateData.family_member_2,
      updateData.family_member_3,
      updateData.family_member_4,
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

    // 面談後アンケート(memo)
    if (updateData.survey && updateData.survey !== "") {
      try {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]"
        );
        const current = await page.inputValue(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea"
        );
        const newNote = `${current}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n面談前アンケート\n${updateData.survey}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n`;
        await page.fill(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea",
          newNote
        );
      } catch (err) {
        const msg = `アンケート入力中にエラー: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
      try {
        updateObject.memoContent = await page
          .locator(
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea"
          )
          .inputValue();
      } catch (e) {
        const msg = `アンケート入力中にエラー: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
      try {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
        );
      } catch (e) {
        const msg = `アンケート入力中にエラー: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    console.log(updateObject);
    const isVisible = await page
      .locator(
        "//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]"
      )
      .isVisible();
    console.log("ボタン表示状態:", isVisible);

    try {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]"
      );
    } catch (err) {
      const msg = `保存に失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }
    await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
    await page.waitForLoadState("networkidle");
    const error = await page
      .locator("//html/body/main/div[1]/div[2]/div/form/div[3]/div[1]/span")
      .textContent();
    if (error) {
      console.log(error);
      if (error.includes("メールアドレス")) {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]"
        );
        await page.fill("#customer_customer_contacts_attributes_0_email", "");
        try {
          updateObject.mailContent = await page
            .locator("#customer_customer_contacts_attributes_0_email")
            .inputValue();
        } catch (e) {
          console.warn("入力値失敗:", e);
        }
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
        );
        console.log(updateObject);
      }
      if (error.includes("担当者")) {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]"
        );
        await page.click(`div[data-label="${registerData.shop} 管理"]`);
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

  if (errors.length > 0) {
    const mailOptions = {
      from: "error@khg-marketing.info",
      to: "shinji.kawano@kh-group.jp",
      subject: "【自動送信】アンケート登録中にエラー発生",
      text: `以下のエラーが発生しました:\n\nrunDataUpdateBeforeInterview\n\n${errors.join(
        "\n"
      )}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("エラーメールを送信しました");
    } catch (err) {
      console.error("メール送信に失敗しました:", err);
    }
  }
};

module.exports = runDataUpdateBeforeInterview;

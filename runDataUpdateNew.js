const { chromium } = require("playwright-chromium");
require("dotenv").config();
const cors = require("cors");
const axios = require("axios");
const nodemailer = require("nodemailer");

const errors = [];

const runDataUpdateNew = async (updateData, brand, pg_mail, pg_pass) => {
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

    await safeSelect(
      "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/div[1]",
      brand,
      "brand",
      "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/input"
    );

    // 連絡先
    try {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]"
      );
      if (updateData.customer_contacts_mobile_phone_number) {
        const mobileValue = updateData.customer_contacts_mobile_phone_number
          .replace(/=|"| /g, "")
          .trim();
        if (mobileValue.charAt(0) === "0") {
          await safeFill(
            "#customer_customer_contacts_attributes_0_mobile_phone_number",
            String(mobileValue),
            "mobile"
          );
        }
      }
      if (updateData.customer_contacts_phone_number) {
        const phoneValue = updateData.customer_contacts_phone_number
          .replace(/=|"| /g, "")
          .trim();
        if (phoneValue.charAt(0) === "0") {
          await safeFill(
            "#customer_customer_contacts_attributes_0_phone_number",
            String(phoneValue),
            "mobile"
          );
        }
      }
      if (updateData.customer_contacts_email.includes("@")) {
        await safeFill(
          "#customer_customer_contacts_attributes_0_email",
          String(updateData.customer_contacts_email),
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

    // 住所
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
    if (updateData.postal_code) {
      const zipValue = updateData.postal_code.replaceAll("-", "");
      if (zipValue.length === 7) {
        await safeFill(selectors.zipInput, updateData.postal_code, "zip");
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
          "data-label"
        );
        updateObject.cityContent = await safeGetValue(
          selectors.cityContent,
          "city",
          "getAttribute",
          "data-label"
        );
        updateObject.townContent = await safeGetValue(
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

    if (updateData.full_address) {
      const streetValue = updateData.full_address
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

    // 販促媒体
    if (updateData.sales_promotion_name) {
      const mediumValue = updateData.sales_promotion_name
        .replace("ホームページ反響", "インターネット検索")
        .replace("ALLGRIT", "公式LINE");
      await safeSelect(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[2]/div/div/div[1]",
        mediumValue,
        "medium",
        "#customer_sales_promotion_id"
      );
    }

    // 担当営業
    if (updateData.in_charge_user_id) {
      await safeStaffSelect(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]",
        updateData.in_charge_user_id,
        "staff",
        "#customer_in_charge_user_id"
      );
    }

    // 顧客ランク
    if (updateData.customized_input_01J82Z5F366ZQ897PXWF6H5ZAM) {
      await safeSelect(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[1]/div[2]/div/div[1]",
        updateData.customized_input_01J82Z5F366ZQ897PXWF6H5ZAM,
        "rank",
        "#customer_customer_customized_input_values_attributes_99_enterprise_select_option_id"
      );
    }

    // 土地の有無
    if (updateData.has_owned_land) {
      await safeSelect(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[2]/div[2]/div/div[1]",
        updateData.has_owned_land,
        "estate",
        "#customer_has_owned_land"
      );
    }

    // 契約スケジュール
    if (updateData.customized_input_01JSE7RNV3VK78YC2GYAG0554D) {
      await safeSelect(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[3]/div[2]/div/div[1]",
        updateData.customized_input_01JSE7RNV3VK78YC2GYAG0554D,
        "period",
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[3]/div[2]/div/div[1]/input"
      );
    }

    // 重視項目
    if (updateData.customized_input_01JSE7DKY5RYY3T8T8NVR1AJMN) {
      await safeSelect(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[5]/div[3]/div[2]/div/div[1]",
        updateData.customized_input_01JSE7DKY5RYY3T8T8NVR1AJMN,
        "importance",
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[5]/div[3]/div[2]/div/div[1]/input"
      );
    }

    // 予算総額
    if (updateData.budget) {
      await safeFill(
        "#customer_budget",
        updateData.budget
          ? String(updateData.budget).replace(/,/g, "").replace("万円", "")
          : "",
        "budget"
      );
    }

    // 問合せのきっかけ
    if (updateData.inquiry_reason) {
      await safeFill(
        "#customer_inquiry_reason",
        updateData.inquiry_reason,
        "medium"
      );
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
    if (updateData.planned_construction_site) {
      await safeFill(
        "#customer_planned_construction_site",
        updateData.planned_construction_site,
        "area"
      );
    }

    // 現居契約形態
    if (updateData.current_contract_type) {
      await safeSelect(
        "#current-contract-type-select",
        updateData.current_contract_type,
        "situation",
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[2]/div[2]/div/div[1]/input"
      );
    }

    // 現居家賃
    if (updateData.current_rent) {
      await safeFill(
        "#customer_current_rent",
        updateData.current_rent
          ? Number(updateData.current_rent.replace("万円", ""))
          : "",
        "rent"
      );
    }

    // 月々支払い予算
    if (updateData.monthly_repayment_amount) {
      await safeFill(
        "#customer_monthly_repayment_amount",
        updateData.monthly_repayment_amount
          ? Number(updateData.monthly_repayment_amount.replace("万円", ""))
          : "",
        "repayment"
      );
    }

    // 返済希望年数
    if (updateData.repayment_years) {
      await safeFill(
        "#customer_repayment_years",
        updateData.repayment_years
          ? Number(updateData.repayment_years.replace("年", ""))
          : "",
        "repayment_years"
      );
    }

    // 自己資金
    if (updateData.self_budget) {
      await safeFill(
        "#customer_self_budget",
        updateData.self_budget
          ? Number(updateData.self_budget.replace("0000", ""))
          : "",
        "self_budget"
      );
    }

    // 現居光熱費
    if (updateData.current_utility_costs) {
      await safeFill(
        "#customer_current_utility_costs",
        Number(updateData.current_utility_costs),
        "utility_costs"
      );
    }

    // 負債総額
    if (updateData.current_loan_balance) {
      try {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[1]/div[2]/div/div[1]"
        );
        await safeFill(
          "#customer_current_loan_balance",
          updateData.current_loan_balance
            ? Number(updateData.current_loan_balance.replace("0000", ""))
            : "",
          "utility_costs"
        );
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
        );
      } catch (err) {
        const msg = `負債総額の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    // 年収・勤務先
    if (updateData.customer_contacts_employer_name) {
      try {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[1]"
        );
        if (updateData.customer_contacts_employment_type) {
          await safeSelect(
            "#customer_contacts_employment_type",
            updateData.customer_contacts_employment_type,
            "employmentType",
            "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[1]/div[1]/div[2]/div/input"
          );
        } //　雇用形態
        await safeFill(
          "#customer_customer_contacts_attributes_0_employer_name",
          updateData.customer_contacts_employer_name,
          "employmentName"
        ); //　会社名
        if (updateData.customer_contacts_employer_address) {
          await safeFill(
            "#customer_customer_contacts_attributes_0_employer_address",
            updateData.customer_contacts_employer_address,
            "employmentAddress"
          );
        } //　会社住所
        if (updateData.customer_contacts_years_of_service) {
          await safeFill(
            "#customer_customer_contacts_attributes_0_years_of_service",
            updateData.customer_contacts_years_of_service
              ? Number(
                  updateData.customer_contacts_years_of_service.replace(
                    "年",
                    ""
                  )
                )
              : 0,
            "employmentYears"
          );
        } //　勤続年数
        if (updateData.customer_contacts_annual_income) {
          await safeFill(
            "#customer_customer_contacts_attributes_0_annual_income",
            updateData.customer_contacts_annual_income
              ? Number(
                  updateData.customer_contacts_annual_income.replace("万円", "")
                )
              : 0,
            "employmentIncome"
          );
        } //　年収
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
        );
      } catch (err) {
        const msg = `年収・勤務先の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    // 商談ステップを入力
    try {
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[1]"
      );
      await safeFill(
        "#calendar_item_0_start_at",
        updateData.step_migration_item_01J82Z5F13B6QVM6X0TCWZHW99,
        "date"
      ); //名簿取得日
      await safeFill(
        "#calendar_item_2_start_at",
        updateData.step_migration_item_01J82Z5F1GQB02S1DEBZPBFDW7,
        "date"
      ); //初回来場日
      await safeFill(
        "#calendar_item_3_start_at",
        updateData.step_migration_item_01JSE75MPCGQW7V2MTY9VM4HXN,
        "date"
      ); //LINEグループ作成
      await safeFill(
        "#calendar_item_5_start_at",
        updateData.step_migration_item_01JSE0CRECT96FMYTZ1ZREC3QR,
        "date"
      ); //事前審査
      await safeFill(
        "#calendar_item_8_start_at",
        updateData.step_migration_item_01JSENACS2FC422ZHEZWNSXNYA,
        "date"
      ); //次回来場日
      await page.click(
        "//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[2]/div[2]/div[2]/button[1]"
      );
    } catch (err) {
      const msg = `商談ステップの入力に失敗: ${err}`;
      console.error(msg);
      errors.push(msg);
    }

    // 面談後アンケート(memo)
    if (updateData.customized_input_01J95TC6KEES87F0YXH29AJP7K) {
      try {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]"
        );
        await safeFill(
          "#customer_customized_input_values_attributes_0_value",
          updateData.customized_input_01J95TC6KEES87F0YXH29AJP7K,
          "survey"
        );
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]"
        );
      } catch (err) {
        const msg = `surveyの入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
      }
    }

    // 商談メモ(備考)
    if (updateData.remarks) {
      try {
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[1]"
        );
        await safeFill("#customer_remarks", updateData.remarks, "note");
        await page.click(
          "//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[2]/button[1]"
        );
      } catch (err) {
        const msg = `noteの入力に失敗: ${err}`;
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
      if (error.includes("担当者")) {
        try {
          await page.click("#in-charge-user-select");
          await page.click(
            `div[data-label="${updateData.in_charge_store} 管理"]`
          );
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
};

module.exports = runDataUpdateNew;

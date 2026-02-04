"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDataRegistrationBeforeInterview = void 0;
const playwright_1 = require("playwright");
const axios_1 = __importDefault(require("axios"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const function_1 = require("../utils/function");
const errors = [];
const runDataRegistrationBeforeInterview = async (registerData, brand, pg_mail, pg_pass) => {
    let pg_id;
    const browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"] });
    const context = await browser.newContext();
    const page = await context.newPage();
    const fillForm = async () => {
        console.log('ログイン成功');
        const registerObject = {};
        await page.click("//html/body/main/div/div[2]/div[1]/div[2]/div[7]/a");
        await page.waitForLoadState("networkidle");
        const nameObject = [
            {
                path: 'xpath=/html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]',
                value: String(registerData.name),
                label: 'name'
            },
            {
                path: 'xpath=/html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[1]',
                value: String(registerData.kana),
                label: 'kana'
            }
        ];
        for (const item of nameObject) {
            await (0, function_1.safeFill)(page, registerObject, errors, item.path, item.value, item.label);
        }
        const selectObject = [
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/div[1]',
                value: brand,
                label: 'brand',
                labelPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/input'
            },
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]',
                value: registerData.staff,
                label: 'staff',
                labelPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input'
            }
        ];
        for (const item of selectObject) {
            await (0, function_1.safeSelect)(page, registerData, errors, item.path, item.value, item.label, item.labelPath);
        }
        const contactObject = [
            {
                path: '#customer_customer_contacts_attributes_0_mobile_phone_number',
                value: String(registerData.mobile.replace(/=|'| /g, '').trim()),
                label: 'mobile'
            },
            {
                path: '#customer_customer_contacts_attributes_0_email',
                value: String(registerData.mail),
                label: 'mail'
            }
        ];
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');
            for (const item of contactObject) {
                await (0, function_1.safeFill)(page, registerObject, errors, item.path, item.value, item.label);
            }
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
        }
        catch (err) {
            const msg = `連絡先の入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        // 以下住所入力
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[1]');
        }
        catch (err) {
            const msg = `住所の入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        const selectors = {
            zipInput: '#customer_postal_code',
            zipSearchBtn: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[1]/div[2]/a',
            zipContent: '#customer_postal_code',
            prefContent: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[2]/div[1]/div/div[1]/input',
            cityContent: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[3]/div/div/div[1]/input',
            townContent: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[4]/div/div/div[1]/input',
            streetInput: '#customer_address_detail',
            streetContent: '#customer_address_detail',
            buildingInput: '#customer_address_building',
        };
        if (registerData.zip) {
            const zipValue = registerData.zip.replace(/-/g, '');
            if (zipValue.length === 7) {
                await (0, function_1.safeFill)(page, registerObject, errors, selectors.zipInput, registerData.zip, 'zip');
                await page.click(selectors.zipSearchBtn);
                await page.waitForTimeout(1500);
                registerObject.zipContent = await (0, function_1.safeGetValue)(page, errors, selectors.zipContent, 'zip', 'inputValue', '');
                registerObject.prefContent = await (0, function_1.safeGetValue)(page, errors, selectors.prefContent, 'pref', 'getAttribute', 'value');
                registerObject.cityContent = await (0, function_1.safeGetValue)(page, errors, selectors.cityContent, 'city', 'getAttribute', 'value');
                registerObject.townContent = await (0, function_1.safeGetValue)(page, errors, selectors.townContent, 'town', 'getAttribute', 'value');
            }
        }
        const prefValue = await (0, function_1.safeGetValue)(page, errors, selectors.prefContent, 'pref', 'getAttribute', 'value');
        const cityValue = await (0, function_1.safeGetValue)(page, errors, selectors.cityContent, 'city', 'getAttribute', 'value');
        const townValue = await (0, function_1.safeGetValue)(page, errors, selectors.townContent, 'town', 'getAttribute', 'value');
        if (registerData.address) {
            const streetValue = registerData.street && registerData.street
                .replace(new RegExp(prefValue, 'g'), '')
                .replace(new RegExp(cityValue, 'g'), '')
                .replace(new RegExp(townValue, 'g'), '');
            await (0, function_1.safeFill)(page, registerObject, errors, selectors.streetInput, streetValue, 'street');
        }
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
        }
        catch (err) {
            const msg = `住所の入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        // 名簿取得日を入力
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const formattedDate = `${yyyy}-${mm}-${dd}T00:00`;
        try {
            await page.click("//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[1]");
            await (0, function_1.safeFill)(page, registerObject, errors, "#calendar_item_0_start_at", formattedDate, "date");
            await page.click("//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[2]/div[2]/div[2]/button[1]");
        }
        catch (err) {
            const msg = `商談ステップの入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        // 建築動機
        await (0, function_1.safeFill)(page, registerObject, errors, "#customer_house_hunting_motivation", `${String(registerData.interest)},${String(registerData.opportunity)}`, "interest");
        // 建築予定地
        await (0, function_1.safeFill)(page, registerObject, errors, "#customer_planned_construction_site", registerData.area, "area");
        // 問合せのきっかけ
        await (0, function_1.safeFill)(page, registerObject, errors, "#customer_inquiry_reason", String(registerData.medium), "medium");
        // 予算総額
        await (0, function_1.safeFill)(page, registerObject, errors, "#customer_budget", registerData.budget
            ? String(registerData.budget).replace("万円", "")
            : "0", "budget");
        // 現居契約形態
        await (0, function_1.safeSelect)(page, registerData, errors, "#current-contract-type-select", registerData.situation, "situation", "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[2]/div[2]/div/div[1]/input");
        // 現居家賃
        await (0, function_1.safeFill)(page, registerObject, errors, "#customer_current_rent", registerData.rent ? String(registerData.rent).replace("万円", "") : "0", "rent");
        // 年収・勤務先
        if (registerData.employment.name) {
            try {
                await page.click("//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[1]");
                await (0, function_1.safeSelect)(page, registerData, errors, "#customer_contacts_employment_type", registerData.employment.type, "employmentType", "//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[1]/div[1]/div[2]/div/input");
                await (0, function_1.safeFill)(page, registerObject, errors, "#customer_customer_contacts_attributes_0_employer_name", registerData.employment.name, "employmentName");
                await (0, function_1.safeFill)(page, registerObject, errors, "#customer_customer_contacts_attributes_0_employer_address", registerData.employment.address, "employmentAddress");
                await (0, function_1.safeFill)(page, registerObject, errors, "#customer_customer_contacts_attributes_0_years_of_service", registerData.employment.years
                    ? registerData.employment.years.replace("年", "")
                    : "0", "employmentYears");
                await (0, function_1.safeFill)(page, registerObject, errors, "#customer_customer_contacts_attributes_0_annual_income", registerData.employment.income
                    ? registerData.employment.income.replace("万円", "")
                    : "0", "employmentIncome");
                await page.click("//html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]");
            }
            catch (err) {
                const msg = `年収・勤務先の入力に失敗: ${err}`;
                console.error(msg);
                errors.push(msg);
            }
        }
        // 家族情報の入力
        const familyMembers = [
            registerData.family_member_1,
            registerData.family_member_2,
            registerData.family_member_3,
            registerData.family_member_4,
        ];
        const baseXPath = "//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div";
        const hasAnyValue = (m) => m?.attribute || m?.name || m?.kana || m?.birth;
        try {
            if (hasAnyValue(familyMembers[0])) {
                await page.click(`${baseXPath}/div[1]`);
                await page.click(`${baseXPath}/div[2]/div[2]/div[1]/button`);
            }
            for (let i = 0; i < familyMembers.length; i++) {
                const member = familyMembers[i];
                if (!hasAnyValue(member))
                    continue;
                if (i > 0) {
                    await page.click(`${baseXPath}/div[2]/div[2]/div[1]/button`);
                }
                const rowIndex = i + 1;
                if (member?.attribute) {
                    await page.selectOption(`${baseXPath}/div[2]/div[2]/div[1]/div[2]/div[${rowIndex}]/div[1]/select`, member.attribute);
                }
                if (member?.name) {
                    await page.fill(`${baseXPath}/div[2]/div[2]/div[1]/div[2]/div[${rowIndex}]/div[3]/input[1]`, member.name);
                }
                if (member?.kana) {
                    await page.fill(`${baseXPath}/div[2]/div[2]/div[1]/div[2]/div[${rowIndex}]/div[4]/input[1]`, member.kana);
                }
                if (member?.birth) {
                    await page.fill(`${baseXPath}/div[2]/div[2]/div[1]/div[2]/div[${rowIndex}]/div[5]/input`, member.birth);
                }
            }
            if (hasAnyValue(familyMembers[0])) {
                await page.click(`${baseXPath}/div[2]/div[2]/div[2]/button[1]`);
            }
        }
        catch (err) {
            const msg = `家族情報入力中にエラー: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        // 面談前アンケート(memo)
        if (registerData.survey && registerData.survey !== "") {
            try {
                await page.click("//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]");
                const current = (await page.inputValue("//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea")) ?? "";
                const newNote = `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n面談前アンケート\n${registerData.survey}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n${current}`;
                await (0, function_1.safeFill)(page, registerObject, errors, "//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea", newNote, "memo");
                await page.click("//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]");
            }
            catch (err) {
                const msg = `アンケート（survey）の入力に失敗: ${err}`;
                console.error(msg);
                errors.push(msg);
            }
        }
        console.log(registerObject);
        const isVisible = await page
            .locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button')
            .isVisible();
        console.log('ボタン表示状態:', isVisible);
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]');
        }
        catch (err) {
            const msg = `保存に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
        await page.waitForLoadState('networkidle');
        const errorText = await page
            .locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[1]/span')
            .textContent();
        if (errorText) {
            console.log(errorText);
            if (errorText.includes('メールアドレス')) {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');
                await page.fill('#customer_customer_contacts_attributes_0_email', '');
                try {
                    registerObject.mailContent = await page
                        .locator('#customer_customer_contacts_attributes_0_email')
                        .inputValue();
                }
                catch (e) {
                    console.warn('入力値失敗:', e);
                }
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
                console.log('メールアドレスを空文字に修正');
            }
            if (errorText.includes('担当者')) {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]');
                await page.click(`div[data-label='${registerData.shop} 管理']`);
                try {
                    registerObject.staffContent = await page
                        .locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input')
                        .getAttribute('data-label');
                }
                catch (e) {
                    console.warn('入力値失敗:', e);
                }
                console.log('担当を店舗管理に変更');
            }
            const isVisible = await page
                .locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button')
                .isVisible();
            console.log('ボタン表示状態:', isVisible);
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button');
            await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
            await page.waitForLoadState('networkidle');
        }
        pg_id = await page.url();
    };
    try {
        await (0, function_1.pgLogin)(page, pg_mail, pg_pass, errors);
    }
    catch (err) {
        console.error("ログイン失敗:", err);
        return;
    }
    try {
        await fillForm();
        console.log("入力成功");
    }
    catch (err) {
        console.error("フォーム入力失敗:", err);
        return;
    }
    await browser.close();
    const transporter = nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL,
            pass: process.env.GMAIL_PASS,
        },
    });
    if (errors.length > 0) {
        const mailOptions = {
            from: 'error@khg-marketing.info',
            to: process.env.GMAIL,
            subject: "【自動送信】アンケート登録中にエラー発生",
            text: `以下のエラーが発生しました:\n\nrunDataRegistrationBeforeInterview\n\n${errors.join("\n")}`,
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log("エラーメールを送信しました");
        }
        catch (err) {
            console.error("メール送信に失敗しました:", err);
        }
        finally {
            errors.length = 0;
        }
    }
    if (pg_id) {
        const now = new Date();
        const nowString = now.toDateString();
        const idValue = String(pg_id)
            .replace("/edit", "")
            .replace("/summary", "")
            .replace("https://pg-cloud.cloud/customers/", "");
        console.log(`${nowString}_${registerData.shop}_${registerData.firstName}_同期処理完了:`);
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
            await axios_1.default.post("https://khg-marketing.info/survey/api/", postData, {
                headers,
            });
            console.log("POST完了");
        }
        catch (error) {
            console.error("エラー:", error);
        }
    }
};
exports.runDataRegistrationBeforeInterview = runDataRegistrationBeforeInterview;

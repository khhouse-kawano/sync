"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDataUpdateBeforeInterview = void 0;
const playwright_1 = require("playwright");
const function_1 = require("../utils/function");
const errors = [];
const nodemailer_1 = __importDefault(require("nodemailer"));
const runDataUpdateBeforeInterview = async (updateData, brand, pg_mail, pg_pass) => {
    const browser = await playwright_1.chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();
    const fillForm = async () => {
        const updateObject = {};
        await page.goto(`https://pg-cloud.cloud/customers/${updateData.id}/summary`);
        await page.waitForLoadState('networkidle');
        const selectObject = [
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/div[1]',
                value: brand,
                label: 'brand',
                labelPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/input'
            },
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]',
                value: updateData.staff,
                label: 'staff',
                labelPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input'
            }
        ];
        for (const item of selectObject) {
            await (0, function_1.safeSelect)(page, updateObject, errors, item.path, item.value, item.label, item.labelPath);
        }
        // 連絡先の入力
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');
            const mobileValue = updateData.mobile && updateData.mobile.replace(/=|'| /g, '').trim();
            if (mobileValue.charAt(0) === '0') {
                await (0, function_1.safeFill)(page, updateObject, errors, '#customer_customer_contacts_attributes_0_mobile_phone_number', String(mobileValue), 'mobile');
            }
            await (0, function_1.safeFill)(page, updateObject, errors, '#customer_customer_contacts_attributes_0_email', String(updateData.mail), 'mail');
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
        }
        catch (err) {
            const msg = `連絡先の入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        // 住所の入力
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
        if (updateData.zip) {
            const zipValue = updateData.zip.replace(/-/g, '');
            if (zipValue.length === 7) {
                await (0, function_1.safeFill)(page, updateObject, errors, selectors.zipInput, updateData.zip, 'zip');
                await page.click(selectors.zipSearchBtn);
                await page.waitForTimeout(1500);
                updateObject.zipContent = await (0, function_1.safeGetValue)(page, errors, selectors.zipContent, 'zip', 'inputValue', '');
                updateObject.prefContent = await (0, function_1.safeGetValue)(page, errors, selectors.prefContent, 'pref', 'getAttribute', 'value');
                updateObject.cityContent = await (0, function_1.safeGetValue)(page, errors, selectors.cityContent, 'city', 'getAttribute', 'value');
                updateObject.townContent = await (0, function_1.safeGetValue)(page, errors, selectors.townContent, 'town', 'getAttribute', 'value');
            }
        }
        const prefValue = await (0, function_1.safeGetValue)(page, errors, selectors.prefContent, 'pref', 'getAttribute', 'value');
        const cityValue = await (0, function_1.safeGetValue)(page, errors, selectors.cityContent, 'city', 'getAttribute', 'value');
        const townValue = await (0, function_1.safeGetValue)(page, errors, selectors.townContent, 'town', 'getAttribute', 'value');
        if (updateData.address) {
            const streetValue = updateData.address
                .replace(new RegExp(prefValue, 'g'), '')
                .replace(new RegExp(cityValue, 'g'), '')
                .replace(new RegExp(townValue, 'g'), '');
            await (0, function_1.safeFill)(page, updateObject, errors, selectors.streetInput, streetValue, 'street');
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
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}T00:00`;
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[1]');
            await (0, function_1.safeFill)(page, updateObject, errors, '#calendar_item_0_start_at', formattedDate, 'date');
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[2]/div[2]/div[2]/button[1]');
        }
        catch (err) {
            const msg = `商談ステップの入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        const fillObject = [
            {
                path: '#customer_budget',
                value: updateData.budget
                    && String(updateData.budget).replace(/,/g, '').replace('万円', ''),
                label: 'budget' // 予算総額
            },
            {
                path: '#customer_inquiry_reason',
                value: updateData.medium,
                label: 'medium' // 問合せのきっかけ
            },
            {
                path: '#customer_house_hunting_motivation',
                value: `${String(updateData.interest)},${String(updateData.opportunity)}`,
                label: 'interest' // 建築動機
            },
            {
                path: '#customer_planned_construction_site',
                value: updateData.area,
                label: 'area' // 建築予定地
            },
            {
                path: '#customer_current_rent',
                value: updateData.rent
                    && String(Number(updateData.rent.replace('万円', ''))),
                label: 'rent' // 現居家賃
            },
            {
                path: '#customer_current_utility_costs',
                value: updateData.current_utility_costs
                    && String(Number(updateData.current_utility_costs)),
                label: 'utility_costs' // 現居光熱費
            }
        ];
        for (const item of fillObject) {
            (0, function_1.safeFill)(page, updateObject, errors, item.path, item.value, item.label);
        }
        // 現居契約形態
        if (updateData.situation) {
            await (0, function_1.safeSelect)(page, updateObject, errors, '#current-contract-type-select', updateData.situation, 'situation', 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[2]/div[2]/div/div[1]/input');
        }
        // 年収・勤務先
        if (updateData.employment.name) {
            try {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[1]');
                if (updateData.employment.type) {
                    await (0, function_1.safeSelect)(page, updateObject, errors, '#customer_contacts_employment_type', updateData.employment.type, 'employmentType', 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[1]/div[1]/div[2]/div/input');
                }
                await (0, function_1.safeFill)(page, updateObject, errors, '#customer_customer_contacts_attributes_0_employer_name', updateData.employment.name, 'employmentName');
                await (0, function_1.safeFill)(page, updateObject, errors, '#customer_customer_contacts_attributes_0_employer_address', updateData.employment.address, 'employmentAddress');
                await (0, function_1.safeFill)(page, updateObject, errors, '#customer_customer_contacts_attributes_0_years_of_service', updateData.employment.years
                    ? updateData.employment.years.replace('年', '')
                    : '0', 'employmentYears');
                await (0, function_1.safeFill)(page, updateObject, errors, '#customer_customer_contacts_attributes_0_annual_income', updateData.employment.income
                    ? updateData.employment.income.replace('万円', '')
                    : '0', 'employmentIncome');
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
            }
            catch (err) {
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
        const baseXPath = 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div';
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
        // 面談後アンケート(memo)
        if (updateData.survey && updateData.survey !== '') {
            try {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]');
                const current = await page.inputValue('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea');
                const newNote = `${current}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n面談前アンケート\n${updateData.survey}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n`;
                await page.fill('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea', newNote);
            }
            catch (err) {
                const msg = `アンケート入力中にエラー: ${err}`;
                console.error(msg);
                errors.push(msg);
            }
            try {
                updateObject.memoContent = await page
                    .locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea')
                    .inputValue();
            }
            catch (e) {
                const msg = `アンケート入力中にエラー: ${e}`;
                console.error(msg);
                errors.push(msg);
            }
            try {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
            }
            catch (e) {
                const msg = `アンケート入力中にエラー: ${e}`;
                console.error(msg);
                errors.push(msg);
            }
        }
        console.log(updateObject);
        const isVisible = await page
            .locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]')
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
        const error = await page
            .locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[1]/span')
            .textContent();
        if (error) {
            console.log(error);
            if (error.includes('メールアドレス')) {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');
                await page.fill('#customer_customer_contacts_attributes_0_email', '');
                try {
                    updateObject.mailContent = await page
                        .locator('#customer_customer_contacts_attributes_0_email')
                        .inputValue();
                }
                catch (e) {
                    console.warn('入力値失敗:', e);
                }
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
                console.log(updateObject);
            }
            if (error.includes('担当者')) {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]');
                await page.click(`div[data-label='${updateData.shop} 管理']`);
                try {
                    updateObject.staffContent = await page
                        .locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input')
                        .getAttribute('data-label');
                }
                catch (e) {
                    console.warn('入力値失敗:', e);
                }
                console.log(updateObject);
            }
            const isVisible = await page
                .locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]')
                .isVisible();
            console.log('ボタン表示状態:', isVisible);
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]');
            await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
            await page.waitForLoadState('networkidle');
        }
    };
    try {
        await (0, function_1.pgLogin)(page, pg_mail, pg_pass, errors);
        console.log('ログイン成功');
    }
    catch (err) {
        console.error('ログイン失敗:', err);
        return;
    }
    try {
        await fillForm();
        console.log('入力成功');
    }
    catch (err) {
        console.error('フォーム入力失敗:', err);
        return;
    }
    const now = new Date();
    const nowString = now.toDateString();
    console.log(`${nowString}_${updateData.staff}_アップデート完了:`);
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
            to: 'shinji.kawano@kh-group.jp',
            subject: '【自動送信】アンケート登録中にエラー発生',
            text: `以下のエラーが発生しました:\n\nrunDataUpdateBeforeInterview\n\n${errors.join('\n')}`,
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log('エラーメールを送信しました');
        }
        catch (err) {
            console.error('メール送信に失敗しました:', err);
        }
        finally {
            errors.length = 0;
        }
    }
};
exports.runDataUpdateBeforeInterview = runDataUpdateBeforeInterview;
module.exports = exports.runDataUpdateBeforeInterview;

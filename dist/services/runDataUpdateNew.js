"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDataUpdateNew = void 0;
const playwright_1 = require("playwright");
const nodemailer_1 = __importDefault(require("nodemailer"));
const function_1 = require("../utils/function");
const errors = [];
const runDataUpdateNew = async (postData, brand, pg_mail, pg_pass) => {
    const browser = await playwright_1.chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();
    const fillForm = async () => {
        const updateObject = {};
        await page.goto(`https://pg-cloud.cloud/customers/${postData.id}/summary`);
        await page.waitForLoadState('networkidle');
        const mediumValue = postData.sales_promotion_name ? postData.sales_promotion_name.replace('ホームページ反響', 'インターネット検索').replace('ALLGRIT', '公式LINE')
            : null;
        const selectObject = [
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]',
                value: postData.in_charge_user,
                label: 'staff',
                parentPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[2]',
                valuePath: '#customer_in_charge_user_id'
            }, {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div',
                value: brand,
                label: 'brand',
                parentPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/div[2]',
                valuePath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/input'
            },
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[2]/div/div/div[1]',
                value: mediumValue,
                label: 'medium',
                parentPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[2]/div/div/div[2]',
                valuePath: '#customer_sales_promotion_id'
            },
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[1]/div[2]/div/div[1]',
                value: postData.customized_input_01J82Z5F366ZQ897PXWF6H5ZAM,
                label: 'rank',
                parentPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[1]/div[2]/div/div[2]',
                valuePath: '#customer_customer_customized_input_values_attributes_99_enterprise_select_option_id'
            },
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[2]/div[2]/div/div[1]',
                value: postData.has_owned_land,
                label: 'estate',
                parentPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[2]/div[2]/div/div[2]',
                valuePath: '#customer_has_owned_land'
            },
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[3]/div[2]/div/div[1]',
                value: postData.customized_input_01JSE7RNV3VK78YC2GYAG0554D,
                label: 'period',
                parentPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[3]/div[2]/div/div[2]',
                valuePath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[3]/div[2]/div/input'
            },
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[5]/div[3]/div[2]/div/div[1]',
                value: postData.customized_input_01JSE7DKY5RYY3T8T8NVR1AJMN,
                label: 'importance',
                parentPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[5]/div[3]/div[2]/div/div[2]',
                valuePath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[5]/div[3]/div[2]/div/input'
            },
            {
                path: '#current-contract-type-select',
                value: postData.current_contract_type,
                label: 'situation',
                parentPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[2]/div[2]/div/div[2]',
                valuePath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[2]/div[2]/div/div[1]/input'
            }
        ];
        for (const item of selectObject) {
            await (0, function_1.safeUpdateSelect)(page, updateObject, errors, item.path, item.value, item.label, item.parentPath, item.valuePath);
        }
        // 連絡先
        const mobileValue = postData.customer_contacts_mobile_phone_number && postData.customer_contacts_mobile_phone_number.replace(/=|'| /g, '').trim();
        const phoneValue = postData.customer_contacts_phone_number && postData.customer_contacts_phone_number.replace(/=|'| /g, '').trim();
        const contactObject = [
            {
                path: '#customer_customer_contacts_attributes_0_mobile_phone_number',
                value: String(mobileValue),
                label: 'phone'
            },
            {
                path: '#customer_customer_contacts_attributes_0_phone_number',
                value: String(phoneValue),
                label: 'mobile'
            },
            {
                path: '#customer_customer_contacts_attributes_0_email',
                value: String(postData.customer_contacts_email),
                label: 'mail'
            }
        ];
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');
            for (const item of contactObject) {
                await (0, function_1.safeUpdateFill)(page, updateObject, errors, item.path, item.value, item.label);
            }
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
        }
        catch (err) {
            const msg = `連絡先の入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        // 住所
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
        if (postData.postal_code) {
            const zipValue = postData.postal_code && postData.postal_code.replace(/-/g, '');
            if (zipValue.length === 7) {
                await (0, function_1.safeUpdateFill)(page, updateObject, errors, selectors.zipInput, postData.postal_code, 'zip');
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
        if (postData.full_address) {
            const streetValue = postData.full_address && postData.full_address
                .replace(new RegExp(prefValue, 'g'), '')
                .replace(new RegExp(cityValue, 'g'), '')
                .replace(new RegExp(townValue, 'g'), '');
            await (0, function_1.safeUpdateFill)(page, updateObject, errors, selectors.streetInput, streetValue, 'street');
            const buildingValue = postData.full_address && postData.full_address
                .replace(new RegExp(prefValue, 'g'), '')
                .replace(new RegExp(cityValue, 'g'), '')
                .replace(new RegExp(townValue, 'g'), '')
                .replace(new RegExp(streetValue, 'g'), '');
            await (0, function_1.safeUpdateFill)(page, updateObject, errors, selectors.buildingInput, buildingValue, 'building');
        }
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
        }
        catch (err) {
            const msg = `住所の入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        const raw = postData.repayment_years && postData.repayment_years.replace('年', '').trim();
        const num = Number(raw);
        const safeValue = Number.isFinite(num) ? String(num) : '0';
        const fillObject = [
            {
                path: '#customer_budget',
                value: postData.budget && String(postData.budget).replace(/,/g, '').replace('万円', ''),
                label: 'budget' // 予算総額
            },
            {
                path: '#customer_inquiry_reason',
                value: postData.inquiry_reason,
                label: 'medium' // 問合せのきっかけ
            },
            {
                path: '#customer_house_hunting_motivation',
                value: String(postData.house_hunting_motivation),
                label: 'interest' // 建築動機
            },
            {
                path: '#customer_planned_construction_site',
                value: postData.planned_construction_site,
                label: 'area' // 建築予定地
            },
            {
                path: '#customer_current_rent',
                value: postData.current_rent && String(Number(postData.current_rent.replace('万円', ''))),
                label: 'rent' // 現居家賃
            },
            {
                path: '#customer_monthly_repayment_amount',
                value: postData.monthly_repayment_amount && String(Number(postData.monthly_repayment_amount.replace('0000', ''))),
                label: 'repayment' // 月々支払い予算
            },
            {
                path: '#customer_repayment_years',
                value: postData.repayment_years && safeValue,
                label: 'repayment_years' // 返済希望年数
            },
            {
                path: '#customer_self_budget',
                value: postData.self_budget && String(Number(postData.self_budget.replace('0000', ''))),
                label: 'self_budget' // 自己資金
            },
            {
                path: '#customer_current_utility_costs',
                value: postData.current_utility_costs && String(Number(postData.current_utility_costs)),
                label: 'utility_costs' // 現居光熱費
            }
        ];
        for (const item of fillObject) {
            (0, function_1.safeUpdateFill)(page, updateObject, errors, item.path, item.value, item.label);
        }
        // 負債総額
        if (postData.current_loan_balance) {
            try {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[1]/div[2]/div/div[1]');
                await (0, function_1.safeUpdateFill)(page, updateObject, errors, '#customer_current_loan_balance', postData.current_loan_balance && String(Number(postData.current_loan_balance.replace('0000', ''))), 'utility_costs');
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
            }
            catch (err) {
                const msg = `負債総額の入力に失敗: ${err}`;
                console.error(msg);
                errors.push(msg);
            }
        }
        // 年収・勤務先
        if (postData.customer_contacts_employer_name) {
            try {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[1]');
                if (postData.customer_contacts_employment_type) {
                    await (0, function_1.safeUpdateSelect)(page, postData, errors, '#customer_contacts_employment_type', postData.customer_contacts_employment_type, 'employmentType', 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[1]/div[1]/div[2]/div/div[2]', 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[1]/div[1]/div[2]/div/input');
                }
                const raw = postData.customer_contacts_annual_income && postData.customer_contacts_annual_income
                    .replace('万円', '')
                    .trim();
                const num = Number(raw);
                const safeValue = Number.isFinite(num) ? String(num) : '0';
                const employObject = [
                    {
                        path: '#customer_customer_contacts_attributes_0_employer_name',
                        value: postData.customer_contacts_employer_name,
                        label: 'employmentName' //　雇用形態
                    },
                    {
                        path: '#customer_customer_contacts_attributes_0_employer_address',
                        value: postData.customer_contacts_employer_address,
                        label: 'employmentAddress' //　会社名
                    },
                    {
                        path: '#customer_customer_contacts_attributes_0_years_of_service',
                        value: postData.customer_contacts_years_of_service && Number(postData.customer_contacts_years_of_service.replace('年', '')),
                        label: 'employmentYears' //　勤続年数
                    },
                    {
                        path: '#customer_customer_contacts_attributes_0_annual_income',
                        value: safeValue,
                        label: 'employmentIncome' //　年収
                    }
                ];
                for (const item of employObject) {
                    await (0, function_1.safeUpdateFill)(page, updateObject, errors, item.path, item.value, item.label);
                }
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[10]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
            }
            catch (err) {
                const msg = `年収・勤務先の入力に失敗: ${err}`;
                console.error(msg);
                errors.push(msg);
            }
        }
        // 商談ステップを入力
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[1]');
            const fillObject = [
                {
                    path: '#calendar_item_0_start_at',
                    value: postData.step_migration_item_01J82Z5F13B6QVM6X0TCWZHW99 && `${postData.step_migration_item_01J82Z5F13B6QVM6X0TCWZHW99.replace(/\//g, '-')}T00:00`,
                    label: 'registerDate' //名簿取得日
                },
                {
                    path: '#calendar_item_2_start_at',
                    value: postData.step_migration_item_01J82Z5F1GQB02S1DEBZPBFDW7 && `${postData.step_migration_item_01J82Z5F1GQB02S1DEBZPBFDW7.replace(/\//g, '-')}T00:00`,
                    label: 'visitedDate' //初回来場日
                },
                {
                    path: '#calendar_item_3_start_at',
                    value: postData.step_migration_item_01JSE75MPCGQW7V2MTY9VM4HXN && `${postData.step_migration_item_01JSE75MPCGQW7V2MTY9VM4HXN.replace(/\//g, '-')}T00:00`,
                    label: 'LineDate' //LINEグループ作成
                },
                {
                    path: '#calendar_item_5_start_at',
                    value: postData.step_migration_item_01JSE0CRECT96FMYTZ1ZREC3QR && `${postData.step_migration_item_01JSE0CRECT96FMYTZ1ZREC3QR.replace(/\//g, '-')}T00:00`,
                    label: 'screeningDate' //事前審査
                },
                {
                    path: '#calendar_item_8_start_at',
                    value: postData.step_migration_item_01JSENACS2FC422ZHEZWNSXNYA && `${postData.step_migration_item_01JSENACS2FC422ZHEZWNSXNYA.replace(/\//g, '-')}T00:00`,
                    label: 'nextDate' //次回来場日
                }
            ];
            for (const item of fillObject) {
                await (0, function_1.safeUpdateFill)(page, updateObject, errors, item.path, item.value, item.label);
            }
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[2]/div[2]/div[2]/button[1]');
        }
        catch (err) {
            const msg = `商談ステップの入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        // 面談後アンケート(memo)
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]');
            await (0, function_1.safeUpdateFill)(page, updateObject, errors, '#customer_customized_input_values_attributes_0_value', postData.customized_input_01J95TC6KEES87F0YXH29AJP7K, 'survey');
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
        }
        catch (err) {
            const msg = `surveyの入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        // 商談メモ(備考)
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[1]');
            await (0, function_1.safeUpdateFill)(page, updateObject, errors, '#customer_remarks', postData.remarks, 'note');
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[2]/button[1]');
        }
        catch (err) {
            const msg = `noteの入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
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
            if (error.includes('担当者')) {
                try {
                    await page.click('#in-charge-user-select');
                    await page.click(`div[data-label='${postData.in_charge_store} 管理']`);
                    updateObject.staffContent = await page
                        .locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input')
                        .getAttribute('data-label');
                }
                catch (e) {
                    console.warn('入力値失敗:', e);
                }
                console.log(updateObject);
            }
            else if (error.includes('メールアドレス')) {
                try {
                    await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');
                    await page.fill('#customer_customer_contacts_attributes_0_email', '');
                    await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
                }
                catch (e) {
                    console.warn('入力値失敗:', e);
                }
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
    console.log(`${nowString}_${postData.customer_contacts_name}_アップデート完了:`);
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
            subject: '【自動送信】データ更新作業中にエラー発生',
            text: `以下のエラーが発生しました:\nrunDataUpdateNew.js\nID:${postData.id}\n${errors.join('\n')}`,
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
exports.runDataUpdateNew = runDataUpdateNew;

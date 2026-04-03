"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDataRegistration = void 0;
const playwright_1 = require("playwright");
const nodemailer_1 = __importDefault(require("nodemailer"));
const function_1 = require("../utils/function");
const errors = [];
const runDataRegistration = async (registerData, brand, pg_mail, pg_pass) => {
    let pg_id;
    const browser = await playwright_1.chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();
    const fillForm = async () => {
        const registerObject = {};
        try {
            await page.waitForURL('https://pg-cloud.cloud/');
            await page.click('body > main > div.home-index > div.home-conteiner > div.home-left-block > div.home-menus-block > div:nth-child(7) > a');
            await page.waitForLoadState('networkidle');
        }
        catch (e) {
            const msg = `ログイン後のページ遷移に失敗: ${e}`;
            console.error(msg);
            errors.push(msg);
        }
        const nameObject = [
            {
                path: 'xpath=/html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]',
                value: String(registerData.firstName),
                label: 'firstName'
            },
            {
                path: 'xpath=/html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[2]',
                value: String(registerData.lastName),
                label: 'lastName'
            },
            {
                path: 'xpath=/html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[1]',
                value: String(registerData.firstKana),
                label: 'firstKana'
            },
            {
                path: 'xpath=/html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[2]',
                value: String(registerData.lastKana),
                label: 'lastKana'
            },
            {
                path: 'xpath=/html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]',
                value: String(registerData.name),
                label: 'name'
            },
        ];
        for (const item of nameObject) {
            await (0, function_1.safeFill)(page, registerObject, errors, item.path, item.value, item.label);
        }
        const contactObject = [
            {
                path: '#customer_customer_contacts_attributes_0_mobile_phone_number',
                value: String(registerData.mobile.replace(/=|'|"| /g, '')),
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
        const mediumValue = registerData.medium
            .replace('ホームページ反響', 'インターネット検索')
            .replace('ALLGRIT', '公式LINE') ?? '';
        const selectObject = [
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/div[1]',
                value: brand,
                label: 'brand',
                labelPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/input'
            },
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[2]/div/div/div[1]',
                value: mediumValue,
                label: 'medium',
                labelPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[2]/div/div/input'
            },
            {
                path: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]',
                value: registerData.staffId,
                label: 'staff',
                labelPath: 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input'
            }
        ];
        for (const item of selectObject) {
            await (0, function_1.safeSelect)(page, registerObject, errors, item.path, item.value, item.label, item.labelPath);
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
        const streetInputValue = await (0, function_1.safeGetValue)(page, errors, selectors.streetContent, 'street', 'getAttribute', 'value');
        if (registerData.street) {
            const streetValue = registerData.street
                .replace(new RegExp(prefValue, 'g'), '')
                .replace(new RegExp(cityValue, 'g'), '')
                .replace(new RegExp(townValue, 'g'), '');
            await (0, function_1.safeFill)(page, registerObject, errors, selectors.streetInput, streetValue, 'street');
        }
        if (registerData.building) {
            const buildingValue = registerData.building
                .replace(new RegExp(prefValue, 'g'), '')
                .replace(new RegExp(cityValue, 'g'), '')
                .replace(new RegExp(townValue, 'g'), '')
                .replace(new RegExp(streetInputValue, 'g'), '');
            await (0, function_1.safeFill)(page, registerObject, errors, selectors.buildingInput, buildingValue, 'building');
        }
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
        }
        catch (err) {
            const msg = `住所の入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        // 商談ステップ
        try {
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[1]');
            const formattedDate = `${registerData.date.replace(/\//g, '-')}T00:00`;
            await (0, function_1.safeFill)(page, registerObject, errors, '#calendar_item_0_start_at', formattedDate, 'date');
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[2]/div[2]/div[2]/button[1]');
        }
        catch (err) {
            const msg = `商談ステップの入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        // 面談後アンケート(memo)
        if (registerData.survey && registerData.survey !== '') {
            try {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]');
                await (0, function_1.safeFill)(page, registerObject, errors, 'xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea', registerData.survey, 'memo');
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
            }
            catch (err) {
                const msg = `アンケート（survey）の入力に失敗: ${err}`;
                console.error(msg);
                errors.push(msg);
            }
        }
        // 商談メモ(備考)
        if (registerData.note && registerData.note !== '') {
            try {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[1]');
                const newNote = `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n来場前アンケート\n${registerData.note}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`;
                const noteSelector = '#customer_remarks';
                await page.fill(noteSelector, newNote);
                registerObject.noteContent = await page
                    .locator(noteSelector)
                    .inputValue();
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[2]/button[1]');
            }
            catch (err) {
                const msg = `note（来場前アンケート）の入力に失敗: ${err}`;
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
        const errorLocator = page.locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[1]/span');
        if (await errorLocator.isVisible()) {
            const errorText = await errorLocator.textContent();
            console.log(`エラーが発生しました: ${errorText}`);
            if (errorText?.includes('メールアドレス')) {
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
            if (errorText?.includes('担当者')) {
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
        console.log('ログイン成功');
    }
    catch (err) {
        console.error('ログイン失敗:', err);
        return;
    }
    try {
        await fillForm();
    }
    catch (err) {
        console.error('フォーム入力失敗:', err);
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
            subject: '【自動送信】データ登録作業中にエラー発生',
            text: `以下のエラーが発生しました:\nrunDataRegistration\n\n${errors.join('\n')}`,
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
    // if (pg_id) {
    //     const now = new Date();
    //     const nowString = now.toDateString();
    //     const url = String(pg_id).replace('edit', 'summary');
    //     console.log(
    //         `${nowString}_${registerData.shop}_${registerData.firstName}_同期処理完了:`,
    //         url
    //     );
    //     let postName;
    //     if (registerData.firstName && registerData.lastName) {
    //         postName = `${registerData.firstName} ${registerData.lastName}`
    //     } else if (registerData.firstName && !registerData.lastName) {
    //         postName = registerData.firstName
    //     } else if (!registerData.firstName && !registerData.lastName && registerData.name) {
    //         postName = registerData.name;
    //     }
    //     let postKana;
    //     if (registerData.firstKana && registerData.lastKana) {
    //         postKana = `${registerData.firstKana} ${registerData.lastKana}`;
    //     } else if (registerData.firstKana && !registerData.lastKana) {
    //         postKana = registerData.firstKana;
    //     }
    //     const postData = {
    //         inquiry_id: registerData.id,
    //         demand: 'sync',
    //         pg_id: url,
    //     };
    //     let postAddress = `${registerData.pref}${registerData.city}${registerData.town}${registerData.street}${registerData.building}`;
    //     const completeData = {
    //         demand: 'new_customer',
    //         id: url
    //             .replace('https://pg-cloud.cloud/customers/', '')
    //             .replace('/summary', ''),
    //         customer_contacts_name: postName ?? '',
    //         customer_contacts_name_kana: postKana ?? '',
    //         shop: registerData.shop,
    //         reserved_status: registerData.reserved_status,
    //         response_status: registerData.response_medium,
    //         campaign: registerData.campaign,
    //         name: postName ?? '',
    //         kana: postKana ?? '',
    //         register: registerData.date,
    //         zip: registerData.zip ?? '',
    //         postal_code: registerData.zip ?? '',
    //         full_address: postAddress ?? '',
    //         customer_contacts_mobile_phone_number: String(registerData.mobile.replace(/=|'|"| /g, '')) ?? '',
    //         customer_contacts_email: registerData.mail,
    //     };
    //     try {
    //         await axios.post(
    //             'https://khg-marketing.info/dashboard/api/changeShop.php',
    //             postData,
    //             {
    //                 headers: { 'Content-Type': 'application/json' },
    //             }
    //         );
    //         console.log('POST完了_inquiry_customer');
    //     } catch (error) {
    //         console.error('エラー:', error);
    //     }
    //     try {
    //         await axios.post(
    //             'https://khg-marketing.info/dashboard/api/changeShop.php',
    //             completeData,
    //             {
    //                 headers: { 'Content-Type': 'application/json' },
    //             }
    //         );
    //         console.log('POST完了_customers');
    //     } catch (error) {
    //         console.error('エラー:', error);
    //     }
    // } else {
    //     const postData = {
    //         inquiry_id: registerData.id,
    //         demand: 'sync_error',
    //     };
    //     try {
    //         await axios.post(
    //             'https://khg-marketing.info/dashboard/api/changeShop.php',
    //             postData,
    //             {
    //                 headers: { 'Content-Type': 'application/json' },
    //             }
    //         );
    //         console.log('POST完了');
    //     } catch (error) {
    //         console.error('エラー:', error);
    //     } finally {
    //         errors.length = 0;
    //     }
    //     console.log('pg_idが取得できませんでした。');
    // }
};
exports.runDataRegistration = runDataRegistration;

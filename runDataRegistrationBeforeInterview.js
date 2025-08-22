const { chromium } = require("playwright-chromium");
require('dotenv').config();
const cors = require('cors');
const axios = require("axios");

const runDataRegistrationBeforeInterview = async (registerData, brand, pg_mail, pg_pass) => {
    let pg_id;
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();

    const login = async () => {
        await page.goto('https://pg-cloud.jp/login');
        await page.fill('#form_email', pg_mail);
        await page.fill('#form_password', pg_pass);
        await page.click('//html/body/main/div/form[1]/div/div[2]/input[2]');
        await page.waitForLoadState('networkidle');
    };

    const fillForm = async () => {
        const registerObject = {};

        await page.click('//html/body/main/div/div[2]/div[1]/div[2]/div[7]/a');
        await page.waitForLoadState('networkidle');
        if (registerData.name) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]', String(registerData.name));
        if (registerData.kana) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[1]', String(registerData.kana));
        try{
            registerObject.firstNameContent = await page.locator('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]').inputValue();
            registerObject.firstKanaContent = await page.locator('//html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[1]').inputValue();
        } catch(e){
            console.warn('入力値失敗:',e);
        }

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/div[1]');
        await page.click(`div[data-label="${brand}"]`);
        try{
            registerObject.brandContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[1]/div[2]/div/input').getAttribute('data-label');
        } catch(e){
            console.warn('入力値失敗:',e);
        }     

        if ( registerData.staff ) {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]');
            await page.click(`div[data-value="${registerData.staff}"]`);
        }
        try{
            registerObject.staffContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input').getAttribute('data-label');
        } catch(e){
            console.warn('入力値失敗:',e);
        }

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');

        const toHalfWidth = (str) => {
            return str.replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/　/g, '');};

        // 電話番号のフォーマット
        if (registerData.phone) {
            const phoneValue = toHalfWidth( registerData.phone.replace(/=|"| /g, '').trim());
            if (phoneValue.charAt(0) === '0')
                await page.fill('#customer_customer_contacts_attributes_0_mobile_phone_number', String(phoneValue));
        }
        try{
            registerObject.mobileContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[1]/div[1]/div[2]/input').inputValue();
        } catch(e){
            console.warn('入力値失敗:',e);
        }
        if (registerData.mobile) {
            const mobileValue = toHalfWidth( registerData.mobile.replace(/=|"| /g, '').trim());
            if (mobileValue.charAt(0) === '0')
                await page.fill('#customer_customer_contacts_attributes_0_phone_number', String(mobileValue));
        }
        try{
            registerObject.mobileContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[1]/div[2]/div[2]/input').inputValue();
        } catch(e){
            console.warn('入力値失敗:',e);
        }

        if (registerData.mail && registerData.mail.includes('@')) await page.fill('#customer_customer_contacts_attributes_0_email', String(registerData.mail));
        try{
            registerObject.mailContent = await page.locator('#customer_customer_contacts_attributes_0_email').inputValue();
        } catch(e){
            console.warn('入力値失敗:',e);
        }

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[1]');

        if (registerData.zip) {
            const zipValue = toHalfWidth(registerData.zip.replace(/[ー-]/g, ''));
            if (String(zipValue).length !== 7) return;
            await page.fill('#customer_postal_code', String(registerData.zip));
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[1]/div[2]/a');
            await page.waitForTimeout(1500);
            try{
                registerObject.zipContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[1]/div[1]/input').inputValue();
                registerObject.prefContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[2]/div[1]/div/input').getAttribute('data-label');
                registerObject.cityContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[3]/div/div/input').getAttribute('data-label');
                registerObject.townContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[4]/div/div/input').getAttribute('data-label');
            } catch(e){
                console.warn('入力値失敗:',e);
            }
        }
        if (registerData.address){
            const addressValue = registerData.address.replace(registerObject.prefContent, '').replace(registerObject.cityContent, '').replace(registerObject.townContent, '');
            await page.fill('#customer_address_detail', addressValue);
            try{
                registerObject.streetContent = await page.locator('#customer_address_detail').inputValue();
                } catch(e){
                console.warn('入力値失敗:',e);
            }
        }

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[2]/button[1]');

        console.log(registerObject);

        // 名簿取得日を入力
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${yyyy}-${mm}-${dd}`;
        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[1]');
        await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[2]/div[2]/div[1]/div[1]/div[2]/input', formattedDate);
        try{
            registerObject.dateContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[2]/div[2]/div[1]/div[1]/div[2]/input').inputValue();
            } catch(e){
            console.warn('入力値失敗:',e);
        }
        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/turbo-frame/div/div[2]/div[2]/div[2]/button[1]');

        if( registerData.family_member_1.attribute || registerData.family_member_1.birth || registerData.family_member_1.kana || registerData.family_member_1.name){
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[1]');
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/button');
            if (registerData.family_member_1.attribute) await page.selectOption('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div/div[1]/select', registerData.family_member_1.attribute);
            if (registerData.family_member_1.name) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div/div[3]/input[1]', registerData.family_member_1.name);
            if (registerData.family_member_1.kana) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div/div[4]/input[1]', registerData.family_member_1.kana);
            if (registerData.family_member_1.birth) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div/div[5]/input', registerData.family_member_1.birth);
            if( registerData.family_member_2.attribute || registerData.family_member_2.birth || registerData.family_member_2.kana || registerData.family_member_2.name){
                await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/button');
                if (registerData.family_member_2.attribute) await page.selectOption('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[2]/div[1]/select', registerData.family_member_2.attribute);
                if (registerData.family_member_2.name) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[2]/div[3]/input[1]', registerData.family_member_2.name);
                if (registerData.family_member_2.kana) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[2]/div[4]/input[1]', registerData.family_member_2.kana);
                if (registerData.family_member_2.birth) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[2]/div[5]/input', registerData.family_member_2.birth);
            }
            if( registerData.family_member_3.attribute || registerData.family_member_3.birth || registerData.family_member_3.kana || registerData.family_member_3.name){
                await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/button');
                if (registerData.family_member_3.attribute) await page.selectOption('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[3]/div[1]/select', registerData.family_member_3.attribute);
                if (registerData.family_member_3.name) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[3]/div[3]/input[1]', registerData.family_member_3.name);
                if (registerData.family_member_3.kana) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[3]/div[4]/input[1]', registerData.family_member_3.kana);
                if (registerData.family_member_3.birth) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[3]/div[5]/input', registerData.family_member_3.birth);
            }
            if( registerData.family_member_4.attribute || registerData.family_member_4.birth || registerData.family_member_4.kana || registerData.family_member_4.name){
                await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/button');
                if (registerData.family_member_4.attribute) await page.selectOption('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[4]/div[1]/select', registerData.family_member_4.attribute);
                if (registerData.family_member_4.name) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[4]/div[3]/input[1]', registerData.family_member_4.name);
                if (registerData.family_member_4.kana) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[4]/div[4]/input[1]', registerData.family_member_4.kana);
                if (registerData.family_member_4.birth) await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[1]/div[2]/div[4]/div[5]/input', registerData.family_member_4.birth);
            }
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[7]/div[1]/div[2]/div/div/div[2]/div[2]/div[2]/button[1]');
        }


        // 面談前アンケート(memo)
        if (registerData.survey && registerData.survey !== ''){
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]');
            const current = await page.inputValue('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea');
            const newNote = `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n面談前アンケート\n${registerData.survey}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n${current}`;
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea', newNote);
            try{
                registerObject.memoContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea').inputValue();
            } catch(e){
                console.warn('入力値失敗:',e);
            }
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
        }


        console.log(registerObject);
        const isVisible = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button').isVisible();
        console.log('ボタン表示状態:', isVisible);
        await page.click('//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button');
        await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
        await page.waitForLoadState('networkidle');
        const error = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[3]/div[1]/span').textContent();
        if(error){
            console.log(error);
            if (error.includes('メールアドレス')){
                await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');
                await page.fill('#customer_customer_contacts_attributes_0_email', '');
                try{
                    registerObject.mailContent = await page.locator('#customer_customer_contacts_attributes_0_email').inputValue();
                } catch(e){
                    console.warn('入力値失敗:',e);
                }
                await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
                console.log(registerObject);
            }
            if (error.includes('担当者')){
                await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]');
                await page.click('div[data-value=""]');
                try{
                    registerObject.staffContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input').getAttribute('data-label');
                } catch(e){
                    console.warn('入力値失敗:',e);
                }
                console.log(registerObject);
            }
            const isVisible = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button').isVisible();
            console.log('ボタン表示状態:', isVisible);
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button');
            await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
            await page.waitForLoadState('networkidle');
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
        console.log('入力成功')
    } catch (err) {
        console.error("フォーム入力失敗:", err);
        return;
    }
    
    await browser.close();

    if (pg_id) {
        const now = new Date();
        const nowString = now.toDateString();
        const url = pg_id.replace('edit', 'summary');
        console.log(`${nowString}_${registerData.shop}_${registerData.firstName}_同期処理完了:`, url);

        const postData = {
            inquiry_id: registerData.id,
            demand: 'sync',
            pg_id: url
        };
    
        console.log(postData);
    
        try {
            const response = await axios.post("https://khg-marketing.info/dashboard/api/changeShop.php", postData, {
                headers: { "Content-Type": "application/json" }
            });
            console.log("POST完了");
        } catch (error) {
            console.error("エラー:", error);
        }
        } else {
        const postData = {
            inquiry_id: registerData.id,
            demand: 'sync_error',
        };
        
        try {
            const response = await axios.post("https://khg-marketing.info/dashboard/api/changeShop.php", postData, {
                headers: { "Content-Type": "application/json" }
            });
            console.log("POST完了");
        } catch (error) {
            console.error("エラー:", error);
        }
            console.log("pg_idが取得できませんでした。");
        }
};

module.exports = runDataRegistrationBeforeInterview;
const express = require("express");
const { chromium } = require("playwright-chromium");
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.post("/", async (req, res) => {
    console.log('start');
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();

    const registerDate = req.body;

    const main = async (mail, password) => {
        try {
            await login(mail, password);
            await fillForm();

            await browser.close();
        } catch (error) {
            console.error('データ登録中にエラーが発生', error);
        }
    };

    const login = async(mail, password) => {
        await page.goto('https://pg-cloud.jp/login');
        await page.fill('#form_email', mail);
        await page.fill('#form_password', password);
        await page.click('//html/body/main/div/form[1]/div/div[2]/input[2]');
        await page.waitForLoadState('networkidle');
    }

    const fillForm= async ()=> {
        await page.click('//html/body/main/div/div[2]/div[1]/div[2]/div[7]/a');
        await page.waitForLoadState('networkidle');
        if (registerDate.firstName ) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]', String(registerDate.firstName)); // 姓
        if (registerDate.lastName) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[2]', String(registerDate.lastName)); // 名
        if (registerDate.firstKana) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[1]', String(registerDate.firstKana)); // セイ
        if (registerDate.lastKana) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[2]', String(registerDate.lastKana)); // メイ        
        
        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]'); // 連絡先入力画面を出す

        // 電話番号のフォーマット
        if (registerDate.mobile) {
            const mobileValue = registerDate.mobile.replace(/=|"| /g, '').trim();
            if ( mobileValue.charAt(0) === '0') await page.fill('#customer_customer_contacts_attributes_0_mobile_phone_number', String(mobileValue)); 
        }
        if (registerDate.mail && registerDate.mail.includes('@')) await page.fill('#customer_customer_contacts_attributes_0_email', String(registerDate.mail)); // Eメール
        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]'); // 連絡先入力画面を閉じる

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[1]'); // 住所入力画面を出す
        if (registerDate.zip) {
            await page.fill('#customer_postal_code', String(registerDate.zip)); // 郵便番号
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[1]/div[2]/a'); // 郵便番号検索ボタン
            await page.waitForTimeout(1500);
        }
        if (registerDate.street) await page.fill('#customer_address_detail', String(registerDate.street)); // 番地

        // 住所データのフォーマット
        const prefValue = await page.$eval('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[2]/div[1]/div/div[1]/input', el => el.value);
        const cityValue = await page.$eval('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[3]/div/div/div[1]/input', el => el.value);
        const buildingValue = registerDate.buildingValue.replaceAll(prefValue, '').replaceAll(cityValue, '');
        
        if ( buildingValue ) await page.fill('#customer_address_building', buildingValue); // 建物
        
        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[2]/button[1]'); // 住所入力画面を閉じる
        
        await page.click('//html/body/main/div/div[2]/div/form/div[3]/div[2]/div/button'); // 登録ボタン
        // await page.waitForTimeout(4500); // 4秒待機 ※詳細編集画面が現れないため
        await page.waitForLoadState('networkidle');
    }
    
    const pg_mail = process.env.MAIL;
    const pg_pass = process.env.PASS;

    await main(pg_mail, pg_pass);

    res.send("処理が完了");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


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
    let pg_id;

    const main = async (mail, password) => {
        try {
            await login(mail, password);
            await fillForm();
            await detailSave();
            await dataCheck();

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
    };

    const fillForm= async ()=> {
        await page.click('//html/body/main/div/div[2]/div[1]/div[2]/div[7]/a');
        await page.waitForLoadState('networkidle');
        if (registerDate.firstName ) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]', String(registerDate.firstName)); // 姓
        if (registerDate.lastName) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[2]', String(registerDate.lastName)); // 名
        if (registerDate.firstKana) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[1]', String(registerDate.firstKana)); // セイ
        if (registerDate.lastKana) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[2]', String(registerDate.lastKana)); // メイ
        pg_id = await page.url();


        if(registerDate.medium) {
            const mediumValue = registerDate.medium === 'ALLGRIT' ? '公式LINE' : registerDate.medium ;
            await page.click('//html/body/main/div/div[2]/div/form/div[1]/div[3]/div[3]/div/div/div[1]'); // 販促媒体名のリストを出す
            await page.click(`div[data-label="${mediumValue}"]`);
        }
        
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
            const zipValue = await registerDate.zip.replaceAll('-', '');
            if ( String(zipValue).length !== 7 ) return;
            await page.fill('#customer_postal_code', String(registerDate.zip)); // 郵便番号
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[1]/div[2]/a'); // 郵便番号検索ボタン
            await page.waitForTimeout(1500);
        }
        if (registerDate.street) await page.fill('#customer_address_detail', String(registerDate.street)); // 番地

        // 住所データのフォーマット
        if ( registerDate.building ) {
            const prefValue = await page.$eval('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[2]/div[1]/div/div[1]/input', el => el.value);
            const cityValue = await page.$eval('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[3]/div/div/div[1]/input', el => el.value);
            const townValue = await page.$eval('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[4]/div/div/div[1]/input', el => el.value);
            const buildingValue = registerDate.building.replaceAll(prefValue, '').replaceAll(cityValue, '').replaceAll(townValue, '');
            await page.fill('#customer_address_building', buildingValue); // 建物
        }
        
        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[2]/button[1]'); // 住所入力画面を閉じる
        
        await page.click('//html/body/main/div/div[2]/div/form/div[3]/div[2]/div/button'); // 登録ボタン
        await page.waitForTimeout(4500); // 4秒待機 ※詳細編集画面が現れないため
        await page.waitForLoadState('networkidle');
    };

    const detailSave = async() =>{
        await page.click('//html/body/main/div/div[2]/div/form/div[3]/div[2]/div/a[1]'); // 詳細編集画面へ
        await page.waitForLoadState('networkidle');

        // 店舗入力
        if ( registerDate.shop && !registerDate.shop.includes('店舗未設定') ) {
            await page.click('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]'); // 店舗ドロップダウンを表示
            const shopValue = registerDate.shop.includes('PGH') ? 'PG HOUSE宮崎店' : registerDate.shop;
            await page.fill('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', String( shopValue )); // 店舗名を入力
            await page.waitForSelector(`div[data-label="${shopValue}"]`);
            await page.click(`div[data-label="${shopValue}"]`);
            const selectedShop = await page.$eval('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', el => el.value);
            if ( selectedShop === '' ) {
                await page.click('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]'); // 店舗ドロップダウンを表示
                const shopValue = registerDate.shop.includes('PGH') ? 'PG HOUSE宮崎店' : registerDate.shop;
                await page.fill('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', String( shopValue )); // 店舗名を入力
                await page.waitForSelector(`div[data-label="${shopValue}"]`);
                await page.click(`div[data-label="${shopValue}"]`);
            }
        }

        // 日付入力
        if ( registerDate.inquiry_date ) {
            const formattedDate = registerDate.inquiry_date.replace(/\//g, '-');
            await page.fill('#calendar_item_0_scheduled_at', formattedDate);
            await page.waitForTimeout(500);  
            await page.fill('#calendar_item_0_start_at', formattedDate);
            await page.waitForTimeout(500); 
            const formattedDateRetry = await page.$eval('#calendar_item_0_start_at', el => el.value);
            const selectedShopRetry = await page.$eval('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', el => el.value);
            if ( formattedDateRetry === "" ){
                await page.fill('#calendar_item_0_scheduled_at', formattedDate);
                await page.waitForTimeout(500);  
            }
            if (selectedShopRetry === "" ){
                await page.fill('#calendar_item_0_start_at', formattedDate);
                await page.waitForTimeout(500); 
            }
        }

        await page.click('//html/body/main/div[1]/div[3]/form/div[4]/div[2]/div[2]/div[1]/button'); // 保存ボタン
        await page.waitForTimeout(1000); // 
    };

    const dataCheck = async() => {
        const selectedShop = await page.$eval('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', el => el.value);
        if ( selectedShop === '' ) {
            await page.click('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]'); // 店舗ドロップダウンを表示
            const shopValue = registerDate.shop.includes('PGH') ? 'PG HOUSE宮崎店' : registerDate.shop;
            await page.fill('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', String( shopValue )); // 店舗名を入力
            await page.waitForSelector(`div[data-label="${shopValue}"]`);
            await page.click(`div[data-label="${shopValue}"]`);
        }

        const formattedDateRetry = await page.$eval('#calendar_item_0_start_at', el => el.value);
        const selectedShopRetry = await page.$eval('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', el => el.value);
        if ( formattedDateRetry === "" ){
            await page.fill('#calendar_item_0_scheduled_at', formattedDate);
            await page.waitForTimeout(500);  
        }
        if (selectedShopRetry === "" ){
            await page.fill('#calendar_item_0_start_at', formattedDate);
            await page.waitForTimeout(500); 
        }
    };
    
    const pg_mail = process.env.MAIL;
    const pg_pass = process.env.PASS;

    await main(pg_mail, pg_pass);


    res.send({
        "message" : "処理が終了",
        "pg_id" : pg_id
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


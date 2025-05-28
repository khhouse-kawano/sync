const express = require("express");
const { chromium } = require("playwright-chromium");
require('dotenv').config();
const cors = require('cors');
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.post("/", async (req, res) => {
    console.log('start');
    const registerData = req.body;
    
    res.send({
        "message": "処理を開始しました",
        "status": "processing"
    });
    
    // バックグラウンド処理を開始
    process.nextTick(() => runDataRegistration(registerData));
});

const runDataRegistration = async (registerData) => {
    let pg_id;
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();

    const login = async (mail, password) => {
        await page.goto('https://pg-cloud.jp/login');
        await page.fill('#form_email', mail);
        await page.fill('#form_password', password);
        await page.click('//html/body/main/div/form[1]/div/div[2]/input[2]');
        await page.waitForLoadState('networkidle');
    };

    const fillForm = async () => {
        await page.click('//html/body/main/div/div[2]/div[1]/div[2]/div[7]/a');
        await page.waitForLoadState('networkidle');
        if (registerData.firstName)
            await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]', String(registerData.firstName));
        if (registerData.lastName)
            await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[2]', String(registerData.lastName));
        if (registerData.firstKana)
            await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[1]', String(registerData.firstKana));
        if (registerData.lastKana)
            await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[2]', String(registerData.lastKana));

        if (registerData.medium) {
            const mediumValue = registerData.medium === 'ALLGRIT' ? '公式LINE' : registerData.medium;
            await page.click('//html/body/main/div/div[2]/div/form/div[1]/div[3]/div[3]/div/div/div[1]');
            await page.click(`div[data-label="${mediumValue}"]`);
        }

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');

        // 電話番号のフォーマット
        if (registerData.mobile) {
            const mobileValue = registerData.mobile.replace(/=|"| /g, '').trim();
            if (mobileValue.charAt(0) === '0')
                await page.fill('#customer_customer_contacts_attributes_0_mobile_phone_number', String(mobileValue));
        }
        if (registerData.mail && registerData.mail.includes('@'))
            await page.fill('#customer_customer_contacts_attributes_0_email', String(registerData.mail));
        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[1]');
        if (registerData.zip) {
            const zipValue = registerData.zip.replaceAll('-', '');
            if (String(zipValue).length !== 7) return;
            await page.fill('#customer_postal_code', String(registerData.zip));
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[1]/div[2]/a');
            await page.waitForTimeout(1500);
        }
        if (registerData.street)
            await page.fill('#customer_address_detail', String(registerData.street));

        // 住所データのフォーマット
        if (registerData.building) {
            const prefValue = await page.$eval('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[2]/div[1]/div/div[1]/input', el => el.value);
            const cityValue = await page.$eval('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[3]/div/div/div[1]/input', el => el.value);
            const townValue = await page.$eval('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[4]/div/div/div[1]/input', el => el.value);
            const streetValue = registerData.street.replaceAll(prefValue, '').replaceAll(cityValue, '').replaceAll(townValue, '');
            const buildingValue = registerData.building.replaceAll(prefValue, '').replaceAll(cityValue, '').replaceAll(townValue, '');
            await page.fill('#customer_address_detail', streetValue);
            await page.fill('#customer_address_building', buildingValue);
        }

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[2]/button[1]');

        await page.click('//html/body/main/div/div[2]/div/form/div[3]/div[2]/div/button');
        await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
        await page.waitForLoadState('networkidle');
    };

    const detailSave = async () => {
        await page.click('//html/body/main/div/div[2]/div/form/div[3]/div[2]/div/a[1]');
        await page.waitForLoadState('networkidle');

        // 店舗入力
        if (registerData.shop && !registerData.shop.includes('店舗未設定')) {
            await page.click('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]');
            const shopValue = registerData.shop.includes('PGH') ? 'PG HOUSE宮崎店' : registerData.shop;
            await page.fill('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', String(shopValue));
            await page.waitForSelector(`div[data-label="${shopValue}"]`);
            await page.click(`div[data-label="${shopValue}"]`);
            const selectedShop = await page.$eval('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', el => el.value);
            if (selectedShop === '') {
                await page.click('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]');
                const shopValue2 = registerData.shop.includes('PGH') ? 'PG HOUSE宮崎店' : registerData.shop;
                await page.fill('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', String(shopValue2));
                await page.waitForSelector(`div[data-label="${shopValue2}"]`);
                await page.click(`div[data-label="${shopValue2}"]`);
            }
        }

        // 日付入力
        if (registerData.date) {
            const formattedDate = registerData.date.replace(/\//g, '-');
            await page.fill('#calendar_item_0_scheduled_at', formattedDate);
            await page.waitForTimeout(500);
            await page.fill('#calendar_item_0_start_at', formattedDate);
            await page.waitForTimeout(500);
            const formattedDateRetry = await page.$eval('#calendar_item_0_start_at', el => el.value);
            const selectedShopRetry = await page.$eval('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', el => el.value);
            if (formattedDateRetry === "") {
                await page.fill('#calendar_item_0_scheduled_at', formattedDate);
                await page.waitForTimeout(500);
            }
            if (selectedShopRetry === "") {
                await page.fill('#calendar_item_0_start_at', formattedDate);
                await page.waitForTimeout(500);
            }
        }

        pg_id = await page.url();

        await page.click('//html/body/main/div[1]/div[3]/form/div[4]/div[2]/div[2]/div[1]/button');
        await page.waitForTimeout(1000);
    };

    const dataCheck = async () => {
        const selectedShop = await page.$eval('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', el => el.value);
        if (selectedShop === '') {
            await page.click('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]');
            const shopValue = registerData.shop.includes('PGH') ? 'PG HOUSE宮崎店' : registerData.shop;
            await page.fill('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', String(shopValue));
            await page.waitForSelector(`div[data-label="${shopValue}"]`);
            await page.click(`div[data-label="${shopValue}"]`);
        }

        const formattedDate = registerData.date.replace(/\//g, '-');
        const formattedDateRetry = await page.$eval('#calendar_item_0_start_at', el => el.value);
        const selectedShopRetry = await page.$eval('//html/body/main/div[1]/div[3]/form/div[2]/div[1]/div[11]/div[1]/input', el => el.value);
        if (formattedDateRetry === "") {
            await page.fill('#calendar_item_0_scheduled_at', formattedDate);
            await page.waitForTimeout(500);
        }
        if (selectedShopRetry === "") {
            await page.fill('#calendar_item_0_start_at', formattedDate);
            await page.waitForTimeout(500);
        }
    };

    const pg_mail = process.env.MAIL;
    const pg_pass = process.env.PASS;

    try {
        await login(pg_mail, pg_pass);
        await fillForm();
        await detailSave();
        await dataCheck();
    } catch (error) {
        console.error('データ登録中にエラーが発生', error);
    }
    
    await browser.close();

    if (pg_id) {
        const url = pg_id.replace('edit', 'summary');
        console.log("処理完了:", url);

        const postData = {
            inquiry_id: registerData.id,
            demand: 'sync',
            pg_id: url
        };
    
    try {
        const response = await fetch("https://khg-marketing.info/dashboard/api/changeShop.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(postData)
        });

    const data = await response.json();
    console.log("レスポンス:", data);
    if (data) console.log("POST完了");
} catch (error) {
    console.error("エラー:", error);
}
        } else {
            console.log("pg_idが取得できませんでした。");
        }
};

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

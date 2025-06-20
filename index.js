const express = require("express");
const { chromium } = require("playwright-chromium");
require('dotenv').config();
const cors = require('cors');
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

const today = new Date();
const formattedDate = today.toISOString();

const idList = [
        { shop: '2L鹿児島店', mail : '2l-kagoshima@example.com' },
        { shop: 'DJH宮崎店', mail : 'djh-miyazaki@example.com' },
        { shop: 'DJH都城店', mail : 'djh-miyakonojo@example.com' },
        { shop: 'DJH霧島店', mail : 'djh-kirishima@example.com' },
        { shop: 'DJH鹿児島北店', mail : 'djh-kagoshima-kita@example.com' },
        { shop: 'DJH薩摩川内店', mail : 'djh-sendai@example.com' },
        { shop: 'FH霧島店', mail : 'fh-kirishima@example.com' },
        { shop: 'FH鹿児島店', mail : 'fh-kagoshima@example.com' },
        { shop: 'KH出水阿久根店', mail : 'kh-izumi-akune@example.com' },
        { shop: 'KH大分店', mail : 'kh-ooita@example.com' },
        { shop: 'KH姶良店', mail : 'kh-aira@example.com' },
        { shop: 'KH宮崎店', mail : 'kh-miyazaki@example.com' },
        { shop: 'KH延岡店', mail : 'kh-nobeoka@example.com' },
        { shop: 'KH薩摩川内店', mail : 'kh-sendai@example.com' },
        { shop: 'KH都城店', mail : 'kh-miyakonojo@example.com' },
        { shop: 'KH霧島店', mail : 'kh-kirishima@example.com' },
        { shop: 'KH鹿児島店', mail : 'kh-kagoshima@example.com' },
        { shop: 'KH鹿屋店', mail : 'kh-kanoya@example.com' },
        { shop: 'なごみ姶良霧島店', mail : 'ngm-aira-kirishima@example.com' },
        { shop: 'なごみ鹿児島店', mail : 'ngm-kagoshima@example.com' },
        { shop: 'KH加世田店', mail : 'kh-kaseda@example.com' },
        { shop: 'KH八代店', mail : 'kh-yatsushiro@example.com' },
        { shop: 'KH佐賀店', mail : 'kh-saga@example.com' },
        { shop: 'DJH鹿屋店', mail : 'djh-kanoya@example.com' },
        { shop: 'PG HOUSE宮崎店', mail : 'pgh-miyazaki@example.com' },
        { shop: 'JH熊本店', mail : 'jh-kumamoto@example.com' },
        { shop: 'JH八代店', mail : 'jh-yatsushiro@example.com' }    ]

app.post("/", async (req, res) => {
    console.log(`${formattedDate}_同期処理受付開始`);
    const registerData = req.body;
    const shopValue = registerData.shop.includes('PGH') ? 'PG HOUSE宮崎店' : registerData.shop;
    
    const selectedShop = idList.find(item => item.shop === shopValue);

    const pg_mail = selectedShop ? selectedShop.mail : null;
    const pg_pass = '4081Marketing';
    
    res.send({
        "message": `${formattedDate}_同期処理を開始しました`,
        "status": "processing"
    });
    
    process.nextTick(() => runDataRegistration(registerData, shopValue, pg_mail, pg_pass));
});


app.post("/api/update", async (req, res) => {
    console.log(`${formattedDate}_アップデート処理受付開始`);
    const updateData = req.body;
    const shopValue = updateData.shop.includes('PGH') ? 'PG HOUSE宮崎店' : updateData.shop;
    
    const selectedShop = idList.find(item => item.shop === shopValue);

    const pg_mail = selectedShop ? selectedShop.mail : null;
    const pg_pass = '4081Marketing';
    
    res.send({
        "message": `${formattedDate}_アップデートを開始しました`,
        "status": "processing"
    });
    
    process.nextTick(() => runDataUpdate(updateData, shopValue, pg_mail, pg_pass));
});

const runDataRegistration = async (registerData, shopValue, pg_mail, pg_pass) => {
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
        await page.click('//html/body/main/div/div[2]/div[1]/div[2]/div[7]/a');
        await page.waitForLoadState('networkidle');
        if (registerData.firstName) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]', String(registerData.firstName));
        if (registerData.lastName) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[2]', String(registerData.lastName));
        if (registerData.firstKana) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[1]', String(registerData.firstKana));
        if (registerData.lastKana) await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[5]/div[1]/div[2]/input[2]', String(registerData.lastKana));

        if (registerData.medium) {
            const mediumValue = registerData.medium === 'ALLGRIT' ? '公式LINE' : registerData.medium;
            await page.click('//html/body/main/div/div[2]/div/form/div[1]/div[3]/div[3]/div/div/div[1]');
            await page.click(`div[data-label="${mediumValue}"]`);
        }

        if ( registerData.staff ) {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[2]/div[2]/div/div[1]');
            await page.click(`div[data-label="${registerData.staff}"]`);
        }

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');

        // 電話番号のフォーマット
        if (registerData.mobile) {
            const mobileValue = registerData.mobile.replace(/=|"| /g, '').trim();
            if (mobileValue.charAt(0) === '0')
                await page.fill('#customer_customer_contacts_attributes_0_mobile_phone_number', String(mobileValue));
        }

        if (registerData.mail && registerData.mail.includes('@')) await page.fill('#customer_customer_contacts_attributes_0_email', String(registerData.mail));
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
        const prefValue = await page.$eval('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[2]/div[1]/div/div[1]/input', el => el.value);
        const cityValue = await page.$eval('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[3]/div/div/div[1]/input', el => el.value);
        const townValue = await page.$eval('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[1]/div/div[2]/div/div[4]/div/div/div[1]/input', el => el.value);

        if (registerData.street) {
            const streetValue = registerData.street.replaceAll(prefValue, '').replaceAll(cityValue, '').replaceAll(townValue, '');
            await page.fill('#customer_address_detail', streetValue);
        }

        if (registerData.building) {
            const buildingValue = registerData.building.replaceAll(prefValue, '').replaceAll(cityValue, '').replaceAll(townValue, '');
            await page.fill('#customer_address_building', buildingValue);
        }

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[2]/div[2]/div/div[2]/div[2]/div[2]/button[1]');

        // 名簿取得日を入力
        if ( registerData.date){
            const formattedDate = registerData.date.replace(/\//g, '-');
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/div/div[1]');
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/div/div[2]/div[2]/div[1]/div[1]/div[2]/input', formattedDate);
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/div/div[2]/div[2]/div[2]/button[1]');
        }


        await page.click('//html/body/main/div/div[2]/div/form/div[3]/div[2]/div/button');
        await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
        await page.waitForLoadState('networkidle');
        pg_id = await page.url();
    };

    try {
        await login();
        console.log('ログイン成功')
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
        console.log(`${nowString}_同期処理完了:`, url);

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
    
        console.log(postData);
    
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


const runDataUpdate = async (updateData, shopValue, pg_mail, pg_pass) => {
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
        await page.goto(`https://pg-cloud.jp/customers/${updateData.id}/summary`);
        await page.waitForLoadState('networkidle');

        if (updateData.medium) {
            const mediumValue = updateData.medium === 'ALLGRIT' ? '公式LINE' : updateData.medium;
            await page.click('//html/body/main/div/div[2]/div/form/div[1]/div[3]/div[3]/div/div/div[1]');
            await page.click(`div[data-label="${mediumValue}"]`);
        }

        if ( updateData.staff && updateData.staff !== '') {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[2]/div[2]/div/div[1]');
            await page.click(`div[data-label="${updateData.staff}"]`);
        }

        if( updateData.rank && updateData.rank !== '') {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[1]/div[2]/div');
            await page.click(`div[data-label="${updateData.rank}"]`);
        } else {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[2]/div[1]/div[2]/div');
            await page.click(`div[data-label=""]`);            
        }

        if ( updateData.estate ){
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[2]/div[2]/div/div[1]');
            await page.click(`div[data-label="${updateData.estate}"]`);
        }

        if ( updateData.period && updateData.period !== '') {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[3]/div[2]/div/div[1]');
            await page.click(`div[data-label="${updateData.period}"]`);
        } else {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[3]/div[2]/div/div[1]');
            await page.click(`div[data-label=""]`);
        }

        if ( updateData.importance && updateData.importance !== '') {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[5]/div[3]/div[2]/div/div[1]');
            await page.click(`div[data-label="${updateData.importance}"]`);
        } else if ( updateData.importance && updateData.importance === '') {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[5]/div[3]/div[2]/div/div[1]');
            await page.click(`div[data-label=""]`);
        }


        const formattedBudget = updateData.budget.replace(',', '').replace('万円', '')
        if ( formattedBudget !== '' ) {
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[8]/div[1]/div[2]/input', formattedBudget);
        } else {
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[8]/div[1]/div[2]/input', '');
        }

        if ( updateData.rival && updateData.rival !== '')  {
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[13]/div[2]/div[2]/textarea', updateData.rival);
        } else {
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[13]/div[2]/div[2]/textarea', '');
        }

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/div/div[1]'); // ステップの入力

        if( updateData.register && updateData.register !== '') {
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/div/div[2]/div[2]/div[1]/div[1]/div[2]/input', updateData.register);
        } else if( updateData.register === ''){
            await page.evaluate(() => {
                const el = document.getElementById('calendar_item_0_start_at');
                if (el) el.value = '';
            });
        }

        if( updateData.reserve && updateData.reserve !== '') {
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/div/div[2]/div[2]/div[1]/div[3]/div[2]/input', updateData.reserve);
        } else if( updateData.reserve === '') {
            await page.evaluate(() => {
                const el = document.getElementById('calendar_item_2_start_at');
                if (el) el.value = '';
            });
        }

        if( updateData.line_group && updateData.line_group !== '') {
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/div/div[2]/div[2]/div[1]/div[4]/div[2]/input', updateData.line_group);
        } else if(  updateData.line_group === '') {
            await page.evaluate(() => {
                const el = document.getElementById('calendar_item_3_start_at');
                if (el) el.value = '';
            });
        }

        if( updateData.screening && updateData.screening !== '') {
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/div/div[2]/div[2]/div[1]/div[6]/div[2]/input', updateData.screening); 
        } else if(  updateData.screening === ''){
            await page.evaluate(() => {
                const el = document.getElementById('calendar_item_5_start_at');
                if (el) el.value = '';
            });
        }

        if( updateData.appointment && updateData.appointment !== '') {
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/div/div[2]/div[2]/div[1]/div[9]/div[2]/input', updateData.appointment);
        } else if( updateData.appointment === ''){
            await page.evaluate(() => {
                const el = document.getElementById('calendar_item_8_start_at');
                if (el) el.value = '';
            });
        }

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[16]/div[1]/div/div/div[2]/div[2]/div[2]/button[1]');

        // 事前アンケート
        if (updateData.survey && updateData.survey !== ''){
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]');
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea', updateData.survey);
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
        } else {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]');
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea', '');
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
        }

        // 商談メモ
        if ( updateData.note && updateData.note !== ''){
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[1]');
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[1]/textarea', updateData.note);
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[2]/button[1]');
        } else {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[1]');
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[1]/textarea', '');
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[2]/button[1]');
        }  

        await page.click('//html/body/main/div/div[2]/div/form/div[3]/div[2]/div/button');
        await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
        await page.waitForLoadState('networkidle');
    };


    try {
        await login();
        console.log('ログイン成功')
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

    const now = new Date();
    const nowString = now.toDateString();
    console.log(`${nowString}_アップデート完了:`);
    
    await browser.close();
};

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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
        { shop: 'JH八代店', mail : 'jh-yatsushiro@example.com' },
        { shop: 'KH熊本店', mail : 'kh-kumamoto@example.com' }    
    ]

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

app.post("/api/robo", async (req, res) => {
    console.log(`${formattedDate}_マイホームロボ連携開始`);
    const updateData = req.body;
    
    const robo_id = 'mr10238';
    const robo_pass = '1pq5wvQj';
    
    res.send({
        "message": `${formattedDate}_アップデートを開始しました`,
        "status": "processing"
    });
    
    process.nextTick(() => runMyHomeRobo(updateData, robo_id, robo_pass));
});

app.post("/api/before_survey", async (req, res) => {
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
    
    process.nextTick(() => runBeforeSurvey(updateData, shopValue, pg_mail, pg_pass));
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
            let mediumValue;
            if ( registerData.medium === 'ALLGRIT' ){
                mediumValue = '公式LINE';
            } else if (registerData.medium === 'ホームページ反響' ){
                mediumValue = 'インターネット検索';
            } else {
                mediumValue = registerData.medium;
            }
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
        }

        if ( updateData.estate ){
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[2]/div[2]/div/div[1]');
            await page.click(`div[data-label="${updateData.estate}"]`);
        }

        if ( updateData.period && updateData.period !== '') {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[3]/div[2]/div/div[1]');
            await page.click(`div[data-label="${updateData.period}"]`);
        } 

        if ( updateData.importance && updateData.importance !== '') {
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[5]/div[3]/div[2]/div/div[1]');
            await page.click(`div[data-label="${updateData.importance}"]`);
        }

        function toHalfWidthNumber(str) {
            return str.replace(/[０-９]/g, s =>
            String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
            );
        }

        const rawBudget = updateData.budget || '';
        const formattedBudget = toHalfWidthNumber(rawBudget).replace(/,/g, '').replace('万円', '');

        if (formattedBudget !== '') {
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[8]/div[1]/div[2]/input', formattedBudget);
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
    console.log(`${nowString}_${updateData.staff}_アップデート完了:`);
    
    await browser.close();
};

const runMyHomeRobo = async (updateData, robo_id, robo_pass) => {
    let mhl_id;
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();

    const login = async () => {
        await page.goto('https://system.my-homerobo.com/login');
        await page.fill('#loginform-username', robo_id);
        await page.fill('#loginform-password', robo_pass);
        await page.click('//html/body/main/div/div[1]/div[2]/div/form/div[3]/div/button');
        await page.waitForLoadState('load');
    };

    const fillForm = async () => {
        await page.click('//html/body/nav/div[2]/a[2]');
        await page.waitForLoadState('networkidle');
        await page.click('//html/body/main/div[2]/div/div/div/div[2]/div[2]/button/a');
        const staff = [
            { id: "2309", name: "濵本 明利" },
            { id: "2565", name: "脇田 晃司" },
            { id: "2310", name: "前田 千智" },
            { id: "2566", name: "坂東 涼子" },
            { id: "2311", name: "梶原 教弘" },
            { id: "2312", name: "坂口 恵理" },
            { id: "2330", name: "飯干 友美" },
            { id: "2606", name: "今村 千佳" },
            { id: "2625", name: "川野 慎司" },
            { id: "2400", name: "福山 省吾" },
            { id: "2401", name: "竹牟禮 裕文" },
            { id: "2415", name: "福川 希翔" },
            { id: "2416", name: "髙木 美加" },
            { id: "2189", name: "株式会社 国分ハウジング" },
            { id: "2195", name: "今村 秀樹" },
            { id: "2196", name: "荻 大介" },
            { id: "2197", name: "藺牟田 隆" },
            { id: "2198", name: "中島 一樹" },
            { id: "2199", name: "萩枝 真希" },
            { id: "2200", name: "谷口 亮雅" },
            { id: "2201", name: "外 政明" },
            { id: "2202", name: "宇都 武幸" },
            { id: "2203", name: "竹田 茂己" },
            { id: "2204", name: "上玉利 幹太" },
            { id: "2205", name: "諸正 このみ" },
            { id: "2206", name: "長井 有希" },
            { id: "2207", name: "満尾 秀幸" },
            { id: "2208", name: "重野 佳奈" },
            { id: "2209", name: "川畑 秀樹" },
            { id: "2210", name: "佐別當 咲香" },
            { id: "2211", name: "野間 千帆里" },
            { id: "2212", name: "西元 寛也" },
            { id: "2213", name: "前田 信幸" },
            { id: "2214", name: "崎山 亮" },
            { id: "2215", name: "山内 洋平" },
            { id: "2216", name: "小松 光志" },
            { id: "2217", name: "佐藤 七星" },
            { id: "2218", name: "森吉 大樹" },
            { id: "2219", name: "増田 吉秀" },
            { id: "2220", name: "井上 健太郎" },
            { id: "2221", name: "大脇 健一" },
            { id: "2222", name: "稲田 尋斗" },
            { id: "2223", name: "内門 晃一" },
            { id: "2224", name: "迫 隆広" },
            { id: "2225", name: "中野 健太" },
            { id: "2226", name: "日髙 康" },
            { id: "2227", name: "下尾 千晶" },
            { id: "2483", name: "高妻 涼平" },
            { id: "2228", name: "淵上 瑠也" },
            { id: "2484", name: "内山 雅彰" },
            { id: "2229", name: "岡元 逸輝" },
            { id: "2485", name: "穴井 建" },
            { id: "2230", name: "稲葉 早紀" },
            { id: "2486", name: "小松 真也" },
            { id: "2231", name: "永吉 陽乃" },
            { id: "2487", name: "後藤 洋美" },
            { id: "2232", name: "園田 柊" },
            { id: "2233", name: "積 元樹" },
            { id: "2234", name: "松下 奈々" },
            { id: "2235", name: "石田 孝" },
            { id: "2236", name: "濵﨑 聡" },
            { id: "2237", name: "満薗 廉" },
            { id: "2238", name: "上野 朋子" },
            { id: "2239", name: "池ノ上 琴乃" },
            { id: "2240", name: "有川 紗弥" },
            { id: "2241", name: "皆越 友希" },
            { id: "2242", name: "青山 天風" },
            { id: "2243", name: "伊地知 章" },
            { id: "2244", name: "内園 大和" },
            { id: "2245", name: "梶永 花" },
            { id: "2246", name: "中村 春陽" },
            { id: "2247", name: "飯伏 玲奈" },
            { id: "2248", name: "黒木 彪斗" },
            { id: "2249", name: "見戸 茂夫" },
            { id: "2250", name: "高 裕真" },
            { id: "2251", name: "中脇 優介" },
            { id: "2252", name: "大田 実樹" },
            { id: "2253", name: "増田 美智" },
            { id: "2254", name: "那木 裕幸" },
            { id: "2255", name: "内囿 真也" },
            { id: "2256", name: "岩尾 奈々" },
            { id: "2257", name: "桑田 千鶴" },
            { id: "2258", name: "岩尾 誠司" },
            { id: "2259", name: "冨岡 里那" },
            { id: "2260", name: "岡元 弘樹" },
            { id: "2261", name: "下迫 壮太" },
            { id: "2262", name: "大野 諭" },
            { id: "2518", name: "茅根 大樹" },
            { id: "2263", name: "松元 万里子" },
            { id: "2264", name: "細川 敏" },
            { id: "2265", name: "松田 雄治" },
            { id: "2266", name: "瀬戸 成那" },
            { id: "2267", name: "前原 亜優美" },
            { id: "2268", name: "玉利 瑛梨佳" },
            { id: "2269", name: "田村 葵" },
            { id: "2270", name: "池田 寛人" },
            { id: "2271", name: "波津久 真衣" },
            { id: "2272", name: "河中 奈穂美" },
            { id: "2273", name: "肥後 智子" },
            { id: "2274", name: "森田 哲生" },
            { id: "2275", name: "森川 杏梨" },
            { id: "2276", name: "原井 さくら" },
            { id: "2277", name: "松下 晃雄" },
            { id: "2278", name: "佐藤 瞳" },
            { id: "2279", name: "満尾 開成" },
            { id: "2280", name: "石牟禮 華月" },
            { id: "2281", name: "有木 稚奈" },
            { id: "2282", name: "徳重 百英" },
            { id: "2283", name: "野﨑 誠" },
            { id: "2284", name: "岡崎 真夕" },
            { id: "2285", name: "石川 幸太郎" },
            { id: "2286", name: "大川内 俊洋" },
            { id: "2287", name: "黒葛原 健裕" },
            { id: "2288", name: "郡山 慶一" },
            { id: "2289", name: "宮里 佑一郎" },
            { id: "2290", name: "外園 公洋" },
            { id: "2291", name: "吉國 一郎" },
            { id: "2292", name: "中島 智彦" },
            { id: "2293", name: "宮元 伸太郎" },
            { id: "2294", name: "谷口 博史" },
        ];
        const targetStaff = staff.find(item => item.name === updateData.staff);
        await page.selectOption('select#customercreateform-member_id', { value: targetStaff.id });
        await page.fill('#customercreateform-name_sei', updateData.firstName);
        await page.fill('#customercreateform-name_mei', updateData.lastName);
        await page.fill('#customercreateform-kana_sei', updateData.firstKana !== '' ? updateData.firstKana : 'とうろくようみょうじ' );
        await page.fill('#customercreateform-kana_mei', updateData.lastKana !== '' ? updateData.lastKana : 'とうろくようなまえ' );
        if ( updateData.mobile !== ''){
            const formattedPhoneNumber = updateData.mobile.replace(/=|"| /g, '').trim();
            await page.fill('#customercreateform-tel_by_others', formattedPhoneNumber);
        }
        if ( updateData.mail !== ''){
            const formattedMail = updateData.mail.replace(/=|"| /g, '').trim();
            await page.fill('#customercreateform-email_by_others', formattedMail);
        }
        await page.click('//html/body/main/div[2]/div/div/div/div[2]/div/form/div[2]/button');
        await page.waitForLoadState('networkidle');
        mhl_id = await page.url();
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

    if (mhl_id) {
            const now = new Date();
            const nowString = now.toDateString();
            console.log(`${nowString}_同期処理完了:`, `${updateData.firstName}様`);

            const postData = {
                inquiry_id: updateData.id,
                demand: 'robo',
                mhl_id: mhl_id
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
                console.log("pg_idが取得できませんでした。");
            }
    };

const runBeforeSurvey = async (updateData, shopValue, pg_mail, pg_pass) => {
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

        // 商談メモ
        if ( updateData.note && updateData.note !== ''){
            const currentNote = await page.inputValue('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[1]');
            const newNote = `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\n${updateData.note}\n\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~${currentNote}`;
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[1]');
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[1]/textarea', newNote);
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
    console.log(`${nowString}_${updateData.shop}_アップデート完了:`);
    
    await browser.close();

    const postData = {
        sbid: updateData.sbid,
        demand: 'before_survey',
        };
    
        try {
            const response = await axios.post("https://khg-marketing.info/dashboard/api/changeShop.php", postData, {
                headers: { "Content-Type": "application/json" }
            });
            console.log("POST完了");
        } catch (error) {
            console.error("エラー:", error);
        }
    
};

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


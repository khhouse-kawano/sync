const { chromium } = require("playwright-chromium");
require('dotenv').config();
const cors = require('cors');
const axios = require("axios");

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
        await page.goto(`${updateData.id}`, { timeout: 30000 });
        console.log('入力画面到達')
        // 商談メモ
        if ( updateData.note && updateData.note !== ''){
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[1]');
            const currentNote = await page.inputValue('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[1]/textarea');
            const newNote = `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n${updateData.note}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n${currentNote}`;
            await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[1]/textarea', newNote);
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[2]/button[1]');
        }  

        await page.click('//html/body/main/div/div[2]/div/form/div[3]/div[2]/div/button');
        await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
        await page.waitForLoadState('networkidle');
    };

    try {
        await login();
        console.log(`ログイン成功${updateData.id}`)
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

module.exports = runBeforeSurvey;
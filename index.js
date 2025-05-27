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
            await fillform();

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

    const fillform= async ()=> {
        await page.click('//html/body/main/div/div[2]/div[1]/div[2]/div[7]/a');
        await page.waitForLoadState('networkidle');
        await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]', registerDate.firstName);
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


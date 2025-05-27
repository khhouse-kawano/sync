const express = require("express");
const { chromium } = require("playwright-chromium");
require('dotenv').config();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.post("/", async (req, res) => {
    console.log('✅ リクエスト受信: POST /');

    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();

    const main = async (mail, password) => {
        try {
            console.log("▶️ ログイン開始");
            await login(mail, password);
            console.log("✅ ログイン完了");

            console.log("▶️ フォーム入力開始");
            await fillform();
            console.log("✅ フォーム入力完了");

        } catch (error) {
            console.error('❌ データ登録中にエラーが発生', error);
            return res.status(500).json({ error: "処理中にエラーが発生しました" });
        } finally {
            console.log("🛑 ブラウザを閉じます");
            await browser.close();
        }
    };

    const login = async (mail, password) => {
        await page.goto('https://pg-cloud.jp/login');
        console.log("🌐 ログインページへ移動");

        await page.fill('#form_email', mail);
        await page.fill('#form_password', password);
        console.log("🔑 メール・パスワード入力完了");

        await page.click('//html/body/main/div/form[1]/div/div[2]/input[2]');
        console.log("🚀 ログインボタンをクリック");

        await page.waitForLoadState('networkidle');
    };

    const fillform = async () => {
        await page.click('//html/body/main/div/div[2]/div[1]/div[2]/div[7]/a');
        console.log("📝 フォームページへ移動");

        await page.waitForLoadState('networkidle');
        await page.fill('//html/body/main/div/div[2]/div/form/div[1]/div[4]/div[1]/div[2]/input[1]', 'ダッシュボードテスト');
        console.log("🖊 フォームにデータ入力");

        await page.click('//html/body/main/div/div[2]/div/form/div[3]/div[2]/div/button'); // 登録ボタン
        console.log("📩 登録ボタンをクリック");

        await page.waitForLoadState('networkidle');
    };

    const pg_mail = process.env.MAIL;
    const pg_pass = process.env.PASS;

    if (!pg_mail || !pg_pass) {
        console.error("⚠ 環境変数が不足しています");
        return res.status(500).json({ error: "環境変数が不足しています" });
    }

    await main(pg_mail, pg_pass);

    res.json({ message: "✅ 処理が完了しました" });
});
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
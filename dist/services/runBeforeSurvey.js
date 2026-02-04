"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runBeforeSurvey = void 0;
const playwright_1 = require("playwright");
const axios_1 = __importDefault(require("axios"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const function_1 = require("../utils/function");
const errors = [];
const runBeforeSurvey = async (updateData, pg_mail, pg_pass) => {
    const browser = await playwright_1.chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();
    const fillForm = async () => {
        await page.goto(`${updateData.id}`, { timeout: 30000 });
        try {
            // 商談メモ
            if (updateData.note && updateData.note !== '') {
                await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[1]');
                const currentNote = await page.inputValue('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[1]/textarea');
                const newNote = `~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n${updateData.note}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n${currentNote}`;
                await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[1]/textarea', newNote);
                await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[14]/div/div/div/div[2]/div[2]/div[2]/button[1]');
            }
            await page.click('//html/body/main/div/div[2]/div/form/div[3]/div[2]/div/button');
            await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
            await page.waitForLoadState('networkidle');
        }
        catch (e) {
            const msg = `商談メモ入力中にエラー発生:${e}`;
            errors.push(msg);
            console.log(msg);
        }
    };
    try {
        await (0, function_1.pgLogin)(page, pg_mail, pg_pass, errors);
        console.log('ログイン成功');
    }
    catch (err) {
        console.error("ログイン失敗:", err);
        return;
    }
    try {
        await fillForm();
        console.log('入力成功');
    }
    catch (err) {
        const msg = `フォーム入力失敗:${err}`;
        errors.push(msg);
        console.log(msg);
        return;
    }
    const now = new Date();
    const nowString = now.toDateString();
    console.log(`${nowString}_${updateData.shop}_アップデート完了:`);
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
            subject: "【自動送信】アンケート登録中にエラー発生",
            text: `以下のエラーが発生しました:\n\nrunDataRegistrationBeforeInterview\n\n${errors.join("\n")}`,
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log("エラーメールを送信しました");
        }
        catch (err) {
            console.error("メール送信に失敗しました:", err);
        }
    }
    const postData = {
        sbid: updateData.sbid,
        demand: 'before_survey',
    };
    try {
        await axios_1.default.post("https://khg-marketing.info/dashboard/api/changeShop.php", postData, {
            headers: { "Content-Type": "application/json" }
        });
        console.log("POST完了");
    }
    catch (error) {
        console.error("エラー:", error);
    }
    finally {
        errors.length = 0;
    }
};
exports.runBeforeSurvey = runBeforeSurvey;

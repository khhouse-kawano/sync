"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMyHomeRobo = void 0;
const playwright_1 = require("playwright");
const function_1 = require("../utils/function");
const errors = [];
const nodemailer_1 = __importDefault(require("nodemailer"));
const axios_1 = __importDefault(require("axios"));
const runMyHomeRobo = async (updateData, roboId, roboPass) => {
    let mhl_id;
    let mhl_url;
    const browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"] });
    const context = await browser.newContext();
    const page = await context.newPage();
    const fillForm = async () => {
        console.log(updateData);
        try {
            await page.click("xpath=/html/body/nav/div[2]/a[2]");
            await page.waitForLoadState("networkidle");
            await page.click("xpath=/html/body/main/div[2]/div/div/div/div[2]/div[2]/button/a");
        }
        catch (err) {
            const msg = `入力ボタンクリックに失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        try {
            await page.fill("#customercreateform-name_sei", updateData.firstName);
            await page.fill("#customercreateform-name_mei", updateData.lastName);
            await page.fill("#customercreateform-kana_sei", updateData.firstKana ?? updateData.firstName);
            await page.fill("#customercreateform-kana_mei", updateData.lastKana ?? updateData.lastName);
            if (updateData.mobile) {
                const formattedPhoneNumber = updateData.mobile
                    .replace(/=|"| /g, "")
                    .trim();
                await page.fill("#customercreateform-tel_by_others", formattedPhoneNumber);
            }
            if (updateData.mail) {
                const formattedMail = updateData.mail.replace(/=|"| /g, "").trim();
                await page.fill("#customercreateform-email_by_others", formattedMail);
            }
            await page.click("xpath=/html/body/main/div[2]/div/div/div/div[2]/div/form/div[2]/button"); //顧客登録
        }
        catch (err) {
            const msg = `顧客情報入力に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        await page.waitForLoadState("load");
        try {
            await page.click('xpath=/html/body/main/div[2]/div/div[2]/div/div/div[2]/div[2]/a[1]');
            await page.waitForLoadState("load");
            await page.waitForSelector('#customer-member_id:enabled');
            await page.selectOption('#customer-member_id', String(updateData.robo_id));
            await page.click('xpath=/html/body/main/div[2]/div/div/div/div[2]/div/form/div[2]/button');
        }
        catch (err) {
            const msg = `担当者登録に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        await page.waitForLoadState("networkidle");
        try {
            await page.click("xpath=/html/body/main/div[2]/div/div[1]/div/ul/li[2]/button");
        }
        catch (err) {
            const msg = `アンケート登録画面遷移に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        await page.waitForLoadState("networkidle");
        try {
            const href = await page
                .locator("xpath=/html/body/main/div[2]/div/div[2]/div/div[2]/div/div/table/tbody/tr/td[6]/a[1]")
                .getAttribute("href");
            mhl_url = href;
        }
        catch (err) {
            const msg = `アンケートリンク取得に失敗: ${err}`;
            console.error(msg);
            errors.push(msg);
        }
        mhl_id = await page.url();
    };
    try {
        await (0, function_1.myHomeRoboLogin)(page, errors, roboId, roboPass);
        console.log("ログイン成功");
    }
    catch (err) {
        const msg = `ログイン失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
        return;
    }
    try {
        await fillForm();
        console.log("入力成功");
    }
    catch (err) {
        const msg = `フォーム入力失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
        return;
    }
    await browser.close();
    const transporter = nodemailer_1.default.createTransport({
        service: "gmail",
        auth: {
            user: "shinji.kawano@kh-group.jp",
            pass: "bdrm wqln tlcr gwmq",
        },
    });
    if (errors.length > 0) {
        const mailOptions = {
            from: "error@khg-marketing.info",
            to: "shinji.kawano@kh-group.jp",
            subject: "マイホームロボ登録中にエラー発生",
            text: `以下のエラーが発生しました:\n\n${errors.join("\n")}`,
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log("エラーメールを送信しました");
        }
        catch (err) {
            console.error("メール送信に失敗しました:", err);
        }
    }
    if (mhl_id) {
        const now = new Date();
        const nowString = now.toDateString();
        console.log(`${nowString}_同期処理完了:`, `${updateData.firstName}様`);
        const postData = {
            inquiry_id: updateData.id,
            demand: "robo",
            mhl_id: mhl_id,
            mhl_url: mhl_url ? mhl_url : "",
        };
        console.log(postData);
        try {
            await axios_1.default.post("https://khg-marketing.info/dashboard/api/changeShop.php", postData, {
                headers: { "Content-Type": "application/json" },
            });
            console.log("POST完了");
        }
        catch (error) {
            console.error("エラー:", error);
        }
    }
    else {
        console.log("pg_idが取得できませんでした。");
    }
};
exports.runMyHomeRobo = runMyHomeRobo;

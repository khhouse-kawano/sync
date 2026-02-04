import { chromium } from 'playwright';
import nodemailer from 'nodemailer';
import { pgLogin } from '../utils/function';
const errors: string[] = [];

export const runDataUpdateAfterInterview = async (updateData: any, brand: string, pg_mail: string, pg_pass: string) => {
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();

    const fillForm = async () => {
        const updateObject: any = {};
        await page.goto(`https://pg-cloud.cloud/customers/${updateData.id}/summary`);
        await page.waitForLoadState('networkidle');


        // 面談後アンケート(memo)
        await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]');
        const current = await page.inputValue('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea');
        const newNote = `${current}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n面談後アンケート\n${updateData.survey}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n`;
        await page.fill('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea', newNote);
        console.log(newNote);
        try {
            updateObject.memoContent = await page.locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea').inputValue();
        } catch (e) {
            const msg = `メモ入力に失敗:', ${e}`
            console.warn(msg);
            errors.push(msg);
        }
        await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]');

        console.log(updateObject);

        const isVisible = await page.locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]').isVisible();
        console.log('ボタン表示状態:', isVisible);

        await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]');
        await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
        await page.waitForLoadState('networkidle');
        const error = await page.locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[1]/span').textContent();
        if (error) {
            console.log(error);
            if (error.includes('担当者')) {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]');
                await page.click('div[data-value=""]');
                try {
                    updateObject.staffContent = await page.locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input').getAttribute('data-label');
                } catch (e) {
                    const msg = `担当入力に失敗:', ${e}`
                    console.warn(msg);
                    errors.push(msg);
                }
                console.log(updateObject);
            }
            if (error.includes('メールアドレス')) {
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');
                await page.fill('#customer_customer_contacts_attributes_0_email', '');
                try {
                    updateObject.mailContent = await page.locator('#customer_customer_contacts_attributes_0_email').inputValue();
                } catch (e) {
                    const msg = `メール入力に失敗:', ${e}`
                    console.warn(msg);
                    errors.push(msg);
                }
                await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
                console.log(updateObject);
            }
            const isVisible = await page.locator('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]').isVisible();
            console.log('ボタン表示状態:', isVisible);
            await page.click('xpath=/html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]');
            await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
            await page.waitForLoadState('networkidle');
        }
    };

    try {
        await pgLogin(page, pg_mail, pg_pass, errors)
        console.log('ログイン成功');
    } catch (err) {
        console.error('ログイン失敗:', err);
        return;
    }

    try {
        await fillForm();
        console.log('入力成功')
    } catch (err) {
        console.error("フォーム入力失敗:", err);
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL,
            pass: process.env.GMAIL_PASS,
        },
    });

    if (errors.length > 0) {
        const mailOptions = {
            from: 'error@khg-marketing.info',
            to: 'shinji.kawano@kh-group.jp',
            subject: '【自動送信】アンケート登録中にエラー発生',
            text: `以下のエラーが発生しました:\n\nrunDataUpdateBeforeInterview\n\n${errors.join(
                '\n'
            )}`,
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('エラーメールを送信しました');
        } catch (err) {
            console.error('メール送信に失敗しました:', err);
        }
    }

    const now = new Date();
    const nowString = now.toDateString();
    console.log(`${nowString}_${updateData.staff}_アップデート完了:`);

    await browser.close();
};

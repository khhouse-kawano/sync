import { recordErrors } from '../utils/syncLog';
import { chromium } from 'playwright';
import axios from 'axios';
import { pgLogin } from '../utils/function';
const errors: string[] = [];

/** Dashboard のゲートウェイ。⚠️ 旧API（dashboard/api/）は廃止済み */
const GATEWAY_URL = "https://khg-marketing.info/dashboard/api/gateway/";

export const runBeforeSurvey = async (updateData: any, pg_mail: string, pg_pass: string) => {
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
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
        } catch (e) {
            const msg = `商談メモ入力中にエラー発生:${e}`;
            errors.push(msg);
            console.log(msg);
        }
    };

    try {
        await pgLogin(page, pg_mail, pg_pass, errors);
        console.log('ログイン成功');
    } catch (err) {
        console.error("ログイン失敗:", err);
        return;
    }

    try {
        await fillForm();
        console.log('入力成功')
    } catch (err) {
        const msg = `フォーム入力失敗:${err}`;
        errors.push(msg);
        console.log(msg);
        return;
    }

    const now = new Date();
    const nowString = now.toDateString();
    console.log(`${nowString}_${updateData.shop}_アップデート完了:`);

    await browser.close();

    // ⚠️ 2026-11-10: エラーのメールはやめ、Dashboard の DB（同期の実行結果）に残す（utils/syncLog.ts）
    recordErrors(errors, 'runBeforeSurvey.ts');

    // ⚠️⚠️ **2026-09-30、旧API（changeShop.php）からゲートウェイへ移した。**
    //   ⚠️ 旧APIは `demand` で枝分かれしていたが、⚠️ **現行は `request` + `roll`。**
    //   ⚠️ 受け口は dashboard の backend/src/handlers/inquiry_update.php。
    const postData = {
        request: 'inquiry_update',
        roll: 'before_survey',
        sbid: updateData.sbid,
    };

    try {
        await axios.post(GATEWAY_URL, postData, {
            headers: { "Content-Type": "application/json" }
        });
        console.log("POST完了");
    } catch (error) {
        console.error("エラー:", error);
    } finally {
        errors.length = 0;
    }

};


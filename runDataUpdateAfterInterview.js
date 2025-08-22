const runDataUpdateAfterInterview = async (updateData, brand, pg_mail, pg_pass) => {
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
        const updateObject = {};
        await page.goto(`https://pg-cloud.jp/customers/${updateData.id}/summary`);
        await page.waitForLoadState('networkidle');


        // 面談後アンケート(memo)
        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[1]');
        const current = await page.inputValue('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea');
        const newNote = `${current}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n面談後アンケート\n${updateData.survey}\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n`;
        await page.fill('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea', newNote);
        console.log(newNote);
        try{
            updateObject.memoContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[1]/textarea').inputValue();
        } catch(e){
            console.warn('入力値失敗:',e);
        }
        await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[4]/div[3]/div[2]/div/div[2]/div[2]/div[2]/button[1]');

        console.log(updateObject);

        const isVisible = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]').isVisible();
        console.log('ボタン表示状態:', isVisible);

        await page.click('//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]');
        await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
        await page.waitForLoadState('networkidle');
        const error = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[3]/div[1]/span').textContent();
        if(error){
            console.log(error);
            if (error.includes('担当者')){
                await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/div[1]');
                await page.click('div[data-value=""]');
                try{
                    updateObject.staffContent = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[1]/div[3]/div[3]/div[2]/div/input').getAttribute('data-label');
                } catch(e){
                    console.warn('入力値失敗:',e);
                }
                console.log(updateObject);
            }
            if (error.includes('メールアドレス')){
                await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[1]');
                await page.fill('#customer_customer_contacts_attributes_0_email', '');
                try{
                    updateObject.mailContent = await page.locator('#customer_customer_contacts_attributes_0_email').inputValue();
                } catch(e){
                    console.warn('入力値失敗:',e);
                }
                await page.click('//html/body/main/div[1]/div[2]/div/form/div[1]/div[6]/div[1]/div[2]/div/div[2]/div[2]/div[2]/button[1]');
                console.log(updateObject);
            }
            const isVisible = await page.locator('//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]').isVisible();
            console.log('ボタン表示状態:', isVisible);
            await page.click('//html/body/main/div[1]/div[2]/div/form/div[3]/div[2]/div/button[1]');
            await page.waitForTimeout(4500); // 詳細編集画面が現れるまで待機
            await page.waitForLoadState('networkidle');
        }
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

module.exports = runDataUpdateAfterInterview;
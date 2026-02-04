export const pgLogin = async (page: any, pg_mail: string, pg_pass: string, errors: string[]) => {
    try {
        console.log(`id${pg_mail}/pass:${pg_mail}`);
        await page.goto('https://pg-cloud.cloud/login');
        await page.fill('#form_email', pg_mail);
        await page.fill('#form_password', pg_pass);
        await page.click('xpath=/html/body/main/div/form[1]/div/div[2]/input[2]');
        await page.waitForLoadState('networkidle');
    } catch (err) {
        const msg = `ログインに失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
}

export const safeFill = async (page: any, object: any, errors: string[], selector: string, value: string | number, label: string) => {
    if (!value || value === 'undefined') return;
    try {
        const locator = page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout: 10000 });
        await locator.click();
        await locator.fill(String(value));
        object[`${label}Content`] = await locator.inputValue();
        console.log(`${label}の入力に成功`)
    } catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
};

export const safeUpdateFill = async (page: any, object: any, errors: string[], selector: string, value: string | number, label: string) => {
    if (value === null || value === 'undefined' || value === undefined) return;
    try {
        const locator = page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout: 10000 });
        await locator.click();
        await locator.fill(String(value));
        object[`${label}Content`] = await locator.inputValue();
        console.log(`${label}の入力に成功`)
    } catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
};

export const safeSelect = async (page: any, object: any, errors: string[], clickSelector: string, value: string, label: string, valueSelector: string) => {
    if (!value || value === 'undefined') return;
    const selector = valueSelector ?? clickSelector;
    try {
        await page.click(clickSelector);
        label === 'staff' ? await page.click(`div[data-value="${value}"]`) : await page.click(`div[data-label="${value}"]`);
        object[`${label}Content`] = await page.locator(selector).getAttribute('data-label');
        console.log(`${label}の選択に成功`);
    } catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
};

export const safeGetValue = async (page: any, errors: string[], selector: string, label: string, method = 'inputValue', attrName: string) => {
    try {
        return method === 'getAttribute' ? await page.locator(selector).getAttribute(attrName) : await page.locator(selector)[method]();
    } catch (err) {
        console.warn(`${label}取得失敗:`, err);
        errors.push(`${label}取得失敗: ${err}`);
        return '';
    }
};

export const myHomeRoboLogin = async (page: any, errors: string[], id: string, pass: string) => {
    try {
        await page.goto("https://system.my-homerobo.com/login");
        await page.fill("#loginform-username", id);
        await page.fill("#loginform-password", pass);
        await page.click(
            "//html/body/main/div/div[1]/div[2]/div/form/div[3]/div/button"
        );
        await page.waitForLoadState("load");
    } catch (err) {
        const msg = `ログインに失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
};

export const formattedShop = (shopValue: string) => {
    return shopValue.includes('2L') ? '2L鹿児島店' : shopValue.replace('PGH', 'PG HOUSE')
};

export const safeUpdateSelect = async (page: any, object: any, errors: string[], clickSelector: string, value: string, label: string, parentSelector = clickSelector, valueSelector = clickSelector,) => {
    if (value === undefined || value === 'undefined' || value === null) return;
    try {
        const clickLocator = page.locator(clickSelector);
        await clickLocator.waitFor({ state: 'visible', timeout: 10000 });
        await clickLocator.click();

        const searchScope = parentSelector
            ? page.locator(parentSelector)
            : clickLocator;

        const optionLocator = label === 'staff' ? searchScope.locator(`div[data-value="${value}"]`) : searchScope.locator(`div[data-label="${value}"]`);

        if ((await optionLocator.count()) === 0) {
            throw new Error(`候補 '${value}' が見つかりません`);
        }

        const target = optionLocator.first();
        await target.waitFor({ state: 'visible', timeout: 10000 });
        await target.scrollIntoViewIfNeeded();
        await target.click();

        const valueLocator = page.locator(valueSelector);
        object[`${label}Content`] =
            (await valueLocator.getAttribute('data-label')) ?? '';
        console.log(`${label}の選択に成功`);
    } catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
};

export const toImapDate = (date: Date): string => {
    const day = date.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
};


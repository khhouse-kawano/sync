"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toImapDate = exports.safeUpdateSelect = exports.formattedShop = exports.myHomeRoboLogin = exports.safeGetValue = exports.safeSelect = exports.safeUpdateFill = exports.safeFill = exports.pgLogin = void 0;
const pgLogin = async (page, pg_mail, pg_pass, errors) => {
    try {
        console.log(`id${pg_mail}/pass:${pg_mail}`);
        await page.goto('https://pg-cloud.cloud/login');
        await page.fill('#form_email', pg_mail);
        await page.fill('#form_password', pg_pass);
        await page.click('xpath=/html/body/main/div/form[1]/div/div[2]/input[2]');
        await page.waitForLoadState('networkidle');
    }
    catch (err) {
        const msg = `ログインに失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
};
exports.pgLogin = pgLogin;
const safeFill = async (page, object, errors, selector, value, label) => {
    if (!value || value === 'undefined')
        return;
    try {
        const locator = page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout: 10000 });
        await locator.click();
        await locator.fill(String(value));
        object[`${label}Content`] = await locator.inputValue();
        console.log(`${label}の入力に成功`);
    }
    catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
};
exports.safeFill = safeFill;
const safeUpdateFill = async (page, object, errors, selector, value, label) => {
    if (value === null || value === 'undefined' || value === undefined)
        return;
    try {
        const locator = page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout: 10000 });
        await locator.click();
        await locator.fill(String(value));
        object[`${label}Content`] = await locator.inputValue();
        console.log(`${label}の入力に成功`);
    }
    catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
};
exports.safeUpdateFill = safeUpdateFill;
const safeSelect = async (page, object, errors, clickSelector, value, label, valueSelector) => {
    if (!value || value === 'undefined')
        return;
    const selector = valueSelector ?? clickSelector;
    try {
        await page.click(clickSelector);
        label === 'staff' ? await page.click(`div[data-value="${value}"]`) : await page.click(`div[data-label="${value}"]`);
        object[`${label}Content`] = await page.locator(selector).getAttribute('data-label');
        console.log(`${label}の選択に成功`);
    }
    catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
};
exports.safeSelect = safeSelect;
const safeGetValue = async (page, errors, selector, label, method = 'inputValue', attrName) => {
    try {
        return method === 'getAttribute' ? await page.locator(selector).getAttribute(attrName) : await page.locator(selector)[method]();
    }
    catch (err) {
        console.warn(`${label}取得失敗:`, err);
        errors.push(`${label}取得失敗: ${err}`);
        return '';
    }
};
exports.safeGetValue = safeGetValue;
const myHomeRoboLogin = async (page, errors, id, pass) => {
    try {
        await page.goto("https://system.my-homerobo.com/login");
        await page.fill("#loginform-username", id);
        await page.fill("#loginform-password", pass);
        await page.click("//html/body/main/div/div[1]/div[2]/div/form/div[3]/div/button");
        await page.waitForLoadState("load");
    }
    catch (err) {
        const msg = `ログインに失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
};
exports.myHomeRoboLogin = myHomeRoboLogin;
const formattedShop = (shopValue) => {
    return shopValue.includes('2L') ? '2L鹿児島店' : shopValue.replace('PGH', 'PG HOUSE');
};
exports.formattedShop = formattedShop;
const safeUpdateSelect = async (page, object, errors, clickSelector, value, label, parentSelector = clickSelector, valueSelector = clickSelector) => {
    if (value === undefined || value === 'undefined' || value === null)
        return;
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
    }
    catch (err) {
        const msg = `${label}の入力に失敗: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
};
exports.safeUpdateSelect = safeUpdateSelect;
const toImapDate = (date) => {
    const day = date.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};
exports.toImapDate = toImapDate;

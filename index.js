const express = require("express");
const { chromium } = require("playwright-chromium");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  // PlaywrightでChromiumを起動（Herokuでは--no-sandboxの指定が必須）
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://m.yahoo.co.jp/", {
      waitUntil: "networkidle",
      timeout: 30000
    });

    const selector = "#log-header-body > div > ul > li:nth-child(1) > section > a > span";
    await page.waitForSelector(selector, { timeout: 15000 });
    const price = await page.$eval(selector, el => el.textContent.trim());

    res.json({
      date: new Date().toISOString(),
      price: price
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "スクレイピング中にエラーが発生しました" });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const express = require("express");
const { chromium } = require("playwright-chromium");
require('dotenv').config();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
    conmsole.log('start');
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://www.town-life.jp/home/kanri/');
        await page.fill('#login', 'kh-t@kh-house.jp');
        await page.fill('#pw', '4081Kokubu');
        await page.click('#main_container > div.login_form > div > form > fieldset > dl.submit > input[type=button]');
        await page.waitForLoadState('load');

        console.log('ログイン完了');

        const downloadPromise = page.waitForEvent('download');
        await page.goto('https://www.town-life.jp/home/kanri/index.php?action_AdminInquiryList=true');
        await page.click('#main_container > div.main_content > div.center_content > form:nth-child(4) > div.btnArea > input[type=button]');
        const download = await downloadPromise;

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const fileName = `./download/${brand.name}_${year}${month}${day}_townlife.csv`;
        await download.saveAs(fileName);

        const sjisBuffer = fs.readFileSync(fileName);
        const unicodeArray = Encoding.convert(sjisBuffer, { to: 'UNICODE', from: 'SJIS', });
        const unicodeString = Encoding.codeToString(unicodeArray);
        fs.writeFileSync(fileName, unicodeString);

        const records= [];
        const columnMapping= {
            '問い合わせID': 'id_townlife',
            '顧客氏名': 'name_townlife',
            'ふりがな': 'kana_townlife',
            '年齢': 'age_townlife',
            '郵便番号': 'zip_townlife',
            '住所都道府県': 'pref_townlife',
            '住所市区町村': 'city_townlife',
            '住所詳細': 'address_townlife',
            'メールアドレス': 'mail_townlife',
            '電話番号': 'phone_townlife',
            '建設予定地': 'place_townlife',
            '建設予定地詳細': 'place_detail_townlife',
            '希望階数': 'floor_townlife',
            '予定人数（大人）': 'adult_townlife',
            '予定人数（子ども）': 'child_townlife',
            '間取り（LDK）': 'ldk_townlife',
            '建物予算': 'budget_townlife',
            '土地の大きさ': 'large_townlife',
            '土地予算': 'budget_estate_townlife',
            '土地に関するご希望': 'demand_estate_townlife',
            '敷地図・土地図面等の添付': 'image_townlife',
            '家のこだわり': 'demand_house_townlife',
            'その他': 'note_townlife',
            'お問合せ日時': 'response_date_townlife',
            '店舗': 'shop_townlife',
            '状況': 'status_townlife',
        }

        fs.createReadStream(fileName)
            .pipe(csv()).on('data', (row) => {
                const mappedRecord = {};
                for (const [key, value] of Object.entries(row)) {
                    mappedRecord[columnMapping[key] || key] = value;
                }
                records.push(mappedRecord);
            })
            .on('end', async () => {
                for (const record of records) {
                    if( record['name_townlife'] !== '取消処理されました'){
                    record['shop_townlife'] = brand.name;
                    if(record['response_date_townlife']){
                        record['response_date_townlife'] = record['response_date_townlife'].replace( /-/g, '/').split(" ")[0];
                    }
                    if(record['address_townlife']) {
                        record['address_townlife'] = record['address_townlife'].replace(/"/g, '').replace('=', '');
                    }
                    if (record['place_detail_townlife']) {
                        const matchedShop = shops.find(
                            shop => shop.brand === record['shop_townlife'] && record['place_detail_townlife'].includes(shop.area)
                        );
                    
                        if(matchedShop){
                            record['shop'] = matchedShop.shop;
                        }
                    }
                    if (!record['response_date_townlife'] || record['shop'] === undefined ){
                        const matchedShop = shops.find(
                            shop => shop.brand === record['shop_townlife'] && record['city_townlife'].includes(shop.area)
                        );
                        record['shop'] = matchedShop ? matchedShop.shop : `${record['shop_townlife'].replace('Nagomi', 'なごみ')}店舗未設定`;
                    }
                    const data = new URLSearchParams(record);
                    try {
                        const response = await axios.post(
                            'https://khg-marketing.info/api/townlife.php',
                            data,
                            {
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded'
                                }
                            }
                        );
                        console.log(record);
                        console.log('Data sent successfully:', response.data);
                    } catch (error) {
                        console.error('Error sending data for record:', record, error);
                    }
                }
            }
            });
            await browser.close();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "スクレイピング中にエラーが発生しました!" });
    } finally {
        await browser.close();
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
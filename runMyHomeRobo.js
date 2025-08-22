const runMyHomeRobo = async (updateData, robo_id, robo_pass) => {
    let mhl_id;
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const context = await browser.newContext();
    const page = await context.newPage();

    const login = async () => {
        await page.goto('https://system.my-homerobo.com/login');
        await page.fill('#loginform-username', robo_id);
        await page.fill('#loginform-password', robo_pass);
        await page.click('//html/body/main/div/div[1]/div[2]/div/form/div[3]/div/button');
        await page.waitForLoadState('load');
    };

    const fillForm = async () => {
        await page.click('//html/body/nav/div[2]/a[2]');
        await page.waitForLoadState('networkidle');
        await page.click('//html/body/main/div[2]/div/div/div/div[2]/div[2]/button/a');
        const staff = [
            { id: "2309", name: "濵本 明利" },
            { id: "2565", name: "脇田 晃司" },
            { id: "2310", name: "前田 千智" },
            { id: "2566", name: "坂東 涼子" },
            { id: "2311", name: "梶原 教弘" },
            { id: "2312", name: "坂口 恵理" },
            { id: "2330", name: "飯干 友美" },
            { id: "2606", name: "今村 千佳" },
            { id: "2625", name: "川野 慎司" },
            { id: "2400", name: "福山 省吾" },
            { id: "2401", name: "竹牟禮 裕文" },
            { id: "2415", name: "福川 希翔" },
            { id: "2416", name: "髙木 美加" },
            { id: "2189", name: "株式会社 国分ハウジング" },
            { id: "2195", name: "今村 秀樹" },
            { id: "2196", name: "荻 大介" },
            { id: "2197", name: "藺牟田 隆" },
            { id: "2198", name: "中島 一樹" },
            { id: "2199", name: "萩枝 真希" },
            { id: "2200", name: "谷口 亮雅" },
            { id: "2201", name: "外 政明" },
            { id: "2202", name: "宇都 武幸" },
            { id: "2203", name: "竹田 茂己" },
            { id: "2204", name: "上玉利 幹太" },
            { id: "2205", name: "諸正 このみ" },
            { id: "2206", name: "長井 有希" },
            { id: "2207", name: "満尾 秀幸" },
            { id: "2208", name: "重野 佳奈" },
            { id: "2209", name: "川畑 秀樹" },
            { id: "2210", name: "佐別當 咲香" },
            { id: "2211", name: "野間 千帆里" },
            { id: "2212", name: "西元 寛也" },
            { id: "2213", name: "前田 信幸" },
            { id: "2214", name: "崎山 亮" },
            { id: "2215", name: "山内 洋平" },
            { id: "2216", name: "小松 光志" },
            { id: "2217", name: "佐藤 七星" },
            { id: "2218", name: "森吉 大樹" },
            { id: "2219", name: "増田 吉秀" },
            { id: "2220", name: "井上 健太郎" },
            { id: "2221", name: "大脇 健一" },
            { id: "2222", name: "稲田 尋斗" },
            { id: "2223", name: "内門 晃一" },
            { id: "2224", name: "迫 隆広" },
            { id: "2225", name: "中野 健太" },
            { id: "2226", name: "日髙 康" },
            { id: "2227", name: "下尾 千晶" },
            { id: "2483", name: "高妻 涼平" },
            { id: "2228", name: "淵上 瑠也" },
            { id: "2484", name: "内山 雅彰" },
            { id: "2229", name: "岡元 逸輝" },
            { id: "2485", name: "穴井 建" },
            { id: "2230", name: "稲葉 早紀" },
            { id: "2486", name: "小松 真也" },
            { id: "2231", name: "永吉 陽乃" },
            { id: "2487", name: "後藤 洋美" },
            { id: "2232", name: "園田 柊" },
            { id: "2233", name: "積 元樹" },
            { id: "2234", name: "松下 奈々" },
            { id: "2235", name: "石田 孝" },
            { id: "2236", name: "濵﨑 聡" },
            { id: "2237", name: "満薗 廉" },
            { id: "2238", name: "上野 朋子" },
            { id: "2239", name: "池ノ上 琴乃" },
            { id: "2240", name: "有川 紗弥" },
            { id: "2241", name: "皆越 友希" },
            { id: "2242", name: "青山 天風" },
            { id: "2243", name: "伊地知 章" },
            { id: "2244", name: "内園 大和" },
            { id: "2245", name: "梶永 花" },
            { id: "2246", name: "中村 春陽" },
            { id: "2247", name: "飯伏 玲奈" },
            { id: "2248", name: "黒木 彪斗" },
            { id: "2249", name: "見戸 茂夫" },
            { id: "2250", name: "高 裕真" },
            { id: "2251", name: "中脇 優介" },
            { id: "2252", name: "大田 実樹" },
            { id: "2253", name: "増田 美智" },
            { id: "2254", name: "那木 裕幸" },
            { id: "2255", name: "内囿 真也" },
            { id: "2256", name: "岩尾 奈々" },
            { id: "2257", name: "桑田 千鶴" },
            { id: "2258", name: "岩尾 誠司" },
            { id: "2259", name: "冨岡 里那" },
            { id: "2260", name: "岡元 弘樹" },
            { id: "2261", name: "下迫 壮太" },
            { id: "2262", name: "大野 諭" },
            { id: "2518", name: "茅根 大樹" },
            { id: "2263", name: "松元 万里子" },
            { id: "2264", name: "細川 敏" },
            { id: "2265", name: "松田 雄治" },
            { id: "2266", name: "瀬戸 成那" },
            { id: "2267", name: "前原 亜優美" },
            { id: "2268", name: "玉利 瑛梨佳" },
            { id: "2269", name: "田村 葵" },
            { id: "2270", name: "池田 寛人" },
            { id: "2271", name: "波津久 真衣" },
            { id: "2272", name: "河中 奈穂美" },
            { id: "2273", name: "肥後 智子" },
            { id: "2274", name: "森田 哲生" },
            { id: "2275", name: "森川 杏梨" },
            { id: "2276", name: "原井 さくら" },
            { id: "2277", name: "松下 晃雄" },
            { id: "2278", name: "佐藤 瞳" },
            { id: "2279", name: "満尾 開成" },
            { id: "2280", name: "石牟禮 華月" },
            { id: "2281", name: "有木 稚奈" },
            { id: "2282", name: "徳重 百英" },
            { id: "2283", name: "野﨑 誠" },
            { id: "2284", name: "岡崎 真夕" },
            { id: "2285", name: "石川 幸太郎" },
            { id: "2286", name: "大川内 俊洋" },
            { id: "2287", name: "黒葛原 健裕" },
            { id: "2288", name: "郡山 慶一" },
            { id: "2289", name: "宮里 佑一郎" },
            { id: "2290", name: "外園 公洋" },
            { id: "2291", name: "吉國 一郎" },
            { id: "2292", name: "中島 智彦" },
            { id: "2293", name: "宮元 伸太郎" },
            { id: "2294", name: "谷口 博史" },
        ];
        const targetStaff = staff.find(item => item.name === updateData.staff);
        await page.selectOption('select#customercreateform-member_id', { value: targetStaff.id });
        await page.fill('#customercreateform-name_sei', updateData.firstName);
        await page.fill('#customercreateform-name_mei', updateData.lastName);
        await page.fill('#customercreateform-kana_sei', updateData.firstKana !== '' ? updateData.firstKana : 'とうろくようみょうじ' );
        await page.fill('#customercreateform-kana_mei', updateData.lastKana !== '' ? updateData.lastKana : 'とうろくようなまえ' );
        if ( updateData.mobile !== ''){
            const formattedPhoneNumber = updateData.mobile.replace(/=|"| /g, '').trim();
            await page.fill('#customercreateform-tel_by_others', formattedPhoneNumber);
        }
        if ( updateData.mail !== ''){
            const formattedMail = updateData.mail.replace(/=|"| /g, '').trim();
            await page.fill('#customercreateform-email_by_others', formattedMail);
        }
        await page.click('//html/body/main/div[2]/div/div/div/div[2]/div/form/div[2]/button');
        await page.waitForLoadState('networkidle');
        mhl_id = await page.url();
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
    
    await browser.close();

    if (mhl_id) {
            const now = new Date();
            const nowString = now.toDateString();
            console.log(`${nowString}_同期処理完了:`, `${updateData.firstName}様`);

            const postData = {
                inquiry_id: updateData.id,
                demand: 'robo',
                mhl_id: mhl_id
            };
    
            console.log(postData);
    
            try {
                const response = await axios.post("https://khg-marketing.info/dashboard/api/changeShop.php", postData, {
                    headers: { "Content-Type": "application/json" }
                });
                console.log("POST完了");
            } catch (error) {
                console.error("エラー:", error);
            }
            } else {
                console.log("pg_idが取得できませんでした。");
            }
    };

module.exports = runMyHomeRobo;
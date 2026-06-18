"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEstateInfo = void 0;
const playwright_1 = require("playwright");
const xlsx_1 = __importDefault(require("xlsx"));
const axios_1 = __importDefault(require("axios"));
const errors = [];
const runEstateInfo = async (estate_robo_id, estate_robo_pass) => {
    const browser = await playwright_1.chromium.launch({ args: ["--no-sandbox"], headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const headers = {
        Authorization: "4081Kokubu",
        "Content-Type": "application/json",
    };
    try {
        // ==========================================
        // 1. ログイン処理
        // ==========================================
        console.log('ログイン処理を開始...');
        await page.goto("https://www.tochi-shinchaku.net/estaterobo/", { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle");
        await page.fill('#kuser_id', estate_robo_id);
        await page.fill('#kpasswd', estate_robo_pass);
        await page.click('xpath=/html/body/div/div[2]/form/div[3]/div[2]/button');
        // ==========================================
        // 2. 物件検索画面へ移動・条件指定
        // ==========================================
        console.log('物件検索画面へ移動...');
        await page.waitForLoadState("networkidle");
        await page.click('xpath=/html/body/div[1]/aside/section/ul/li[3]'); // メニュークリック「物件」
        await page.waitForLoadState("networkidle");
        await page.click('xpath=/html/body/div[1]/aside/section/ul/li[3]/ul/li[1]/a'); // メニュークリック「物件検索編集」
        await page.waitForLoadState("networkidle");
        await page.click('#req_created'); // カレンダーをクリック
        await page.click('xpath=/html/body/div[2]/div[1]/ul/li[1]'); // 直近30日をクリック
        // ==========================================
        // 3. ダウンロードとデータ抽出・API送信
        // ==========================================
        console.log('ダウンロードを開始...');
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 120000 }),
            page.click('xpath=/html/body/div[1]/form/div/section[2]/div/div/div[1]/div[2]/div/p/button[2]', { noWaitAfter: true }) //「Excel出力」
        ]);
        const savePath = '/tmp/land.xlsx'; // ※サーバーの/tmpディレクトリに保存されます
        await download.saveAs(savePath);
        console.log('ダウンロード完了');
        const workbook = xlsx_1.default.readFile(savePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx_1.default.utils.sheet_to_json(sheet, {
            header: [
                'property_id', 'property_type', 'property_category', 'reins_property_id', 'sales_status',
                'transaction_status', 'price', 'address_pref', 'address_city', 'address_town',
                'property_name', 'room_number', 'latitude', 'longitude', 'railway_line',
                'nearest_station', 'walk_time1', 'bus_time', 'bus_route', 'bus_stop',
                'walk_time2', 'unit_price_sqm', 'unit_price_tsubo', 'yield_percent', 'land_right',
                'zoning1', 'zoning2', 'current_status', 'special_note_flag', 'delivery',
                'delivery_condition', 'note1', 'note2', 'sales_point', 'brokerage_type',
                'equipment_free', 'feature_free', 'condition_free', 'free_memo', 'registered_at',
                'updated_at', 'contracted_at', 'contracted_year_month', 'info_source', 'register_method',
                'display_flag', 'image_exists_flag', 'latlng_set_flag', 'listing_company', 'listing_company_tel',
                'construction_company', 'permission_type', 'photo_permission_type', 'permission_date', 'permission_fax_id',
                'permission_fax_sent_flag', 'permission_fax_sent_date', 'floor_plan', 'floor_plan_code', 'floor_plan_detail',
                'built_year_month', 'exclusive_area', 'balcony_area', 'direction', 'floors_above',
                'floors_below', 'floor_number', 'total_units', 'parking_flag', 'parking_fee',
                'parking_count', 'parking_deposit', 'parking_note', 'management_fee', 'reserve_fund',
                'management_type', 'management_method', 'land_area', 'private_road_area', 'building_area',
                'building_structure', 'national_land_law', 'city_planning', 'land_category', 'topography',
                'bcr1', 'far1', 'bcr2', 'far2', 'corner_flag',
                'road_condition1', 'road_condition2', 'road_condition3', 'best_use', 'legal_restrictions',
                'movie_url1', 'movie_url2', 'no_brokerage_fee_flag', 'admin_memo', 'reins_no_image_flag',
                'reins_image_import_flag'
            ],
            range: 1, // 1行目（ヘッダー）をスキップしてデータのみ取得
            defval: ''
        });
        console.log(`${rows.length}件の物件データを取得`);
        const payload = { estates: rows, request: 'estate_update' };
        const response = await axios_1.default.post("https://khg-marketing.info/dashboard/api/gateway/", payload, { headers });
        console.log('APIレスポンス:', response.data.status);
    }
    catch (err) {
        // 途中でエラーが起きた場合はここに飛んでくる
        const msg = `処理中にエラーが発生しました: ${err}`;
        console.error(msg);
        errors.push(msg);
    }
    finally {
        // ★成功してもエラーになっても、必ず最後にブラウザを閉じる
        console.log('ブラウザを終了します');
        await browser.close();
    }
};
exports.runEstateInfo = runEstateInfo;

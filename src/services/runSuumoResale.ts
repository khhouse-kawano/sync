import { chromium } from 'playwright';
import { readFile, writeFile } from 'fs/promises';
import iconv from 'iconv-lite';
import { parse } from 'csv-parse/sync';
import axios from 'axios';
import { sendErrorMail } from './sendErrorMail';
const errors: string[] = [];
// テーブル定義順のカラム名配列（id と created_at は除外）
const resaleColumns = [
    'received_at', 'sequence_no', 'source_campaign', 'recipient_type', 'recipient_code',
    'spare_1', 'spare_2', 'spare_3', 'spare_4', 'spare_5',
    'last_name_kanji', 'first_name_kanji', 'last_name_kana', 'first_name_kana',
    'zip_code_1', 'zip_code_2', 'address_1', 'address_2', 'address_3', 'email',
    'phone_1', 'phone_2', 'phone_3', 'fax_1', 'fax_2', 'fax_3',
    'current_residence', 'planned_occupants', 'eldest_child_lifestage', 'parking_available',
    'annual_income', 'birth_date', 'age', 'desired_move_in',
    'preferred_area_1', 'preferred_area_2', 'preferred_area_3', 'budget_rent',
    'preferred_layout_1', 'preferred_layout_2', 'preferred_layout_3', 'preferred_layout_4',
    'preferred_layout_5', 'preferred_layout_6', 'preferred_living_area',
    'other_property_type_1', 'other_property_type_2', 'other_property_type_3', 'other_property_type_4',
    'inquiry_unit', 'other', 'preferred_contact_method', 'preferred_contact_time',
    'inquiry_content_1', 'inquiry_content_2', 'inquiry_content_3', 'inquiry_content_4', 'inquiry_content_5',
    'inquiry_comment', 'inquiry_other',
    'reserve_1', 'reserve_2', 'reserve_3', 'reserve_4', 'reserve_5',
    'customer_notes', 'sale_assessment_info', 'commercial_info',
    'company_name', 'branch_name', 'company_location', 'company_tel',
    'media_name', 'media_type', 'issue', 'page',
    'property_type', 'status', 'property_code', 'property_name_1', 'property_name_2',
    'company_property_code', 'contact_person', 'inquiry_unit_detail',
    'line_name', 'nearest_station', 'bus_or_walk', 'property_location',
    'price_or_rent', 'layout', 'area_building_area', 'land_area',
    'free_1', 'free_2'
];

// ★ 追加: 英語キーを日本語名に変換する辞書
// ※もし実際のSUUMOの画面上の項目名と少し違う場合は、ここの右側の日本語を書き換えてください
const columnNameMap: Record<string, string> = {
    'received_at': '受付日時', 'sequence_no': '連番', 'source_campaign': '発生元キャンペーン',
    'recipient_type': '宛先種別', 'recipient_code': '宛先コード',
    'spare_1': '予備1', 'spare_2': '予備2', 'spare_3': '予備3', 'spare_4': '予備4', 'spare_5': '予備5',
    'last_name_kanji': '氏名（漢字）姓', 'first_name_kanji': '氏名（漢字）名',
    'last_name_kana': '氏名（カナ）姓', 'first_name_kana': '氏名（カナ）名',
    'zip_code_1': '郵便番号1', 'zip_code_2': '郵便番号2',
    'address_1': '住所1', 'address_2': '住所2', 'address_3': '住所3', 'email': 'メールアドレス',
    'phone_1': '電話番号1', 'phone_2': '電話番号2', 'phone_3': '電話番号3',
    'fax_1': 'FAX1', 'fax_2': 'FAX2', 'fax_3': 'FAX3',
    'current_residence': '現住居形態', 'planned_occupants': '入居予定人数',
    'eldest_child_lifestage': '第一子ライフステージ', 'parking_available': '駐車場の有無',
    'annual_income': '年収', 'birth_date': '生年月日', 'age': '年齢', 'desired_move_in': '入居希望時期',
    'preferred_area_1': '希望エリア1', 'preferred_area_2': '希望エリア2', 'preferred_area_3': '希望エリア3', 'budget_rent': '予算/賃料',
    'preferred_layout_1': '希望間取り1', 'preferred_layout_2': '希望間取り2', 'preferred_layout_3': '希望間取り3',
    'preferred_layout_4': '希望間取り4', 'preferred_layout_5': '希望間取り5', 'preferred_layout_6': '希望間取り6',
    'preferred_living_area': '希望専有面積',
    'other_property_type_1': 'その他希望物件種別1', 'other_property_type_2': 'その他希望物件種別2',
    'other_property_type_3': 'その他希望物件種別3', 'other_property_type_4': 'その他希望物件種別4',
    'inquiry_unit': '反響単位', 'other': 'その他', 'preferred_contact_method': '希望連絡方法', 'preferred_contact_time': '希望連絡時間帯',
    'inquiry_content_1': 'お問い合わせ内容1', 'inquiry_content_2': 'お問い合わせ内容2', 'inquiry_content_3': 'お問い合わせ内容3',
    'inquiry_content_4': 'お問い合わせ内容4', 'inquiry_content_5': 'お問い合わせ内容5',
    'inquiry_comment': 'お問い合わせコメント', 'inquiry_other': 'その他のお問い合わせ',
    'reserve_1': '予約1', 'reserve_2': '予約2', 'reserve_3': '予約3', 'reserve_4': '予約4', 'reserve_5': '予約5',
    'customer_notes': '顧客メモ', 'sale_assessment_info': '売却査定情報', 'commercial_info': '事業用情報',
    'company_name': '会社名', 'branch_name': '支店名', 'company_location': '会社所在地', 'company_tel': '会社電話番号',
    'media_name': '媒体名', 'media_type': '媒体種別', 'issue': '発行', 'page': 'ページ',
    'property_type': '物件種別', 'status': 'ステータス', 'property_code': '物件コード',
    'property_name_1': '物件名1', 'property_name_2': '物件名2',
    'company_property_code': '自社物件コード', 'contact_person': '担当者', 'inquiry_unit_detail': '反響単位詳細',
    'line_name': '沿線名', 'nearest_station': '最寄り駅', 'bus_or_walk': 'バス・徒歩', 'property_location': '物件所在地',
    'price_or_rent': '価格/賃料', 'layout': '間取り', 'area_building_area': '専有面積/建物面積', 'land_area': '土地面積',
    'free_1': 'フリー項目1', 'free_2': 'フリー項目2'
};

export const runSuumoResale = async (id: string, pass: string) => {
    const browser = await chromium.launch({ args: ["--no-sandbox"], headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const login = async () => {
        try {
            await page.goto('https://jds.suumo.jp/jds/CJ000AU001/');
            await page.waitForLoadState("networkidle");
            await page.fill('xpath=/html/body/div/div[2]/div/form/div[1]/div[1]/input', id);
            await page.fill('xpath=/html/body/div/div[2]/div/form/div[1]/div[2]/input', pass);
            await page.click('xpath=/html/body/div/div[2]/div/form/div[3]/input');
        } catch (err) {
            const msg = `ログイン処理に失敗${err}`;
            console.log(msg);
            errors.push(msg);
        }
    };

    const waitForMinute = async () => {
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(1000);
    }

    const customerSearch = async () => {
        try {
            await page.click('xpath=/html/body/div/div[1]/div[1]/div[9]/a');
            await waitForMinute();
            await page.click('xpath=/html/body/div/div[2]/div/form/div[5]/div[2]/input');
            await waitForMinute();
            await page.click('xpath=/html/body/div/div[2]/div/form/div[3]/div[1]/div[2]/div[2]/input[1]');
            await page.click('xpath=/html/body/div/div[2]/div/form/div[3]/div[1]/div[2]/div[3]/input[2]');
            await page.click('xpath=/html/body/div/div[2]/div/form/div[3]/div[2]/input[1]');
            await waitForMinute();
        } catch (err) {
            const msg = `お客様ページへの遷移に失敗${err}`;
            console.log(msg);
            errors.push(msg);
        }
    };

    const processAndPostData = async () => {
        try {
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 120000 }),
                page.click('xpath=/html/body/div/div[2]/div/form/div[3]/div[2]/a')
            ]);

            const savePath = '/tmp/resale.csv';
            const summaryPath = '/tmp/resale_import_summary.json';
            await download.saveAs(savePath);
            console.log('CSVダウンロード完了');

            const buf: Buffer = await readFile(savePath);
            const text: string = iconv.decode(buf, 'cp932');

            const records = parse(text, {
                columns: resaleColumns,
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true
            }) as Record<string, unknown>[];

            console.log(`パース完了: 合計 ${records.length} 件`);

            // ★ 修正: remarks作成時に日本語名へ変換
            const mappedRecords = records.map(record => {
                const remarksList: string[] = [];

                for (const [key, valRaw] of Object.entries(record)) {
                    const cell = valRaw === undefined || valRaw === null ? "" : String(valRaw).trim();
                    // columnNameMapから日本語名を取得。もし未定義のキーがあれば英語キーをそのまま使う
                    const jaKey = columnNameMap[key] || key;
                    remarksList.push(`${jaKey}：${cell}`);
                }

                return {
                    ...record,
                    remarks: remarksList.join('\n')
                };
            });

            const POST_URL = 'https://khg-marketing.info/dashboard/api/gateway/';
            async function postChunkWithRetry(url: string, chunk: any[], retries = 2, delayMs = 1000) {
                const payload = {
                    request: 'suumo_db_resale',
                    data: chunk
                };

                let lastErr: any = null;
                for (let attempt = 0; attempt <= retries; attempt++) {
                    try {
                        const res = await axios.post(url, payload, {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 60000
                        });
                        return res.data ?? {};
                    } catch (err) {
                        lastErr = err;
                        if (attempt < retries) await new Promise(r => setTimeout(r, delayMs));
                    }
                }
                throw lastErr;
            }

            const CHUNK_SIZE = 500;
            const successes: any[] = [];
            const failures: any[] = [];

            console.log(`API送信開始（${CHUNK_SIZE}件ずつバルク送信）...`);

            for (let i = 0; i < mappedRecords.length; i += CHUNK_SIZE) {
                const chunk = mappedRecords.slice(i, i + CHUNK_SIZE);
                const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;

                try {
                    console.log(`チャンク ${chunkNumber} 送信中 (${chunk.length} 件)...`);
                    const res = await postChunkWithRetry(POST_URL, chunk);
                    successes.push({ chunkIndex: chunkNumber, response: res });
                } catch (err) {
                    const errMsg = err && (err as any).message ? (err as any).message : String(err);
                    console.error(`チャンク ${chunkNumber} の送信に失敗:`, errMsg);
                    failures.push({ chunkIndex: chunkNumber, error: errMsg });
                }
            }

            console.log(`処理完了！ 成功チャンク: ${successes.length}, 失敗チャンク: ${failures.length}`);

            await writeFile(summaryPath, JSON.stringify({ success: successes, errors: failures }, null, 2), 'utf8');
            console.log('サマリーを保存しました:', summaryPath);

        } catch (err) {
            console.error('処理中にエラーが発生しました:', err);
            errors.push(`処理エラー: ${err}`);
        }
    };

    await login();
    await customerSearch();
    await processAndPostData();

    await browser.close();
    await sendErrorMail(errors, 'runSuumoKaeru.ts');

};
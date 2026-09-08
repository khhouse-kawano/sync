import fs from 'fs/promises';
import { sendErrorMail } from './sendErrorMail';
import path from 'path';
import axios from 'axios';

const API_BASE_URL = 'https://public-api.hotlead.jp';
const POST_API_URL = 'https://khg-marketing.info/dashboard/api/gateway/';

async function getAccessToken(id: string, pass: string) {
    const tokenUrl = 'https://prd-hotlead.auth.ap-northeast-1.amazoncognito.com/oauth2/token';
    const credentials = Buffer.from(`${id}:${pass}`).toString('base64');
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', id);

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    if (!response.ok) throw new Error(`トークン取得失敗: ${await response.text()}`);
    const data = await response.json();
    return data.access_token;
}

const today = new Date();
const year = String(today.getFullYear());
const month = String(today.getMonth() + 1).padStart(2, '0');
const date = String(today.getDate()).padStart(2, '0');
const todayStr = `${year}-${month}-${date}`;

const findTickets = async (token: string) => {
    const url = `${API_BASE_URL}/public/api/tickets?updated_from=${todayStr}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) throw new Error(`追客情報取得エラー: ${await response.text()}`);

    const data = await response.json();

    const fileName = `tickets_${month}.json`;
    const filePath = path.join(__dirname, fileName);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ 追客情報を保存しました: ${filePath}`);

    return data;
}


const postTicketsToPhpApi = async (ticketsData: any) => {
    if (!POST_API_URL) {
        console.warn('⚠️ POST_API_URL が設定されていないため、POST送信をスキップします。');
        return;
    }

    const list = ticketsData?.data || [];
    console.log(`🚀 計 ${list.length} 件のデータを送信開始します...`);

    let successCount = 0;
    let failCount = 0;
    let insertCount = 0;
    let updateCount = 0;
    let masterLinkedTotal = 0;

    for (const [index, item] of list.entries()) {
        try {
            const response = await axios.post(POST_API_URL, { ...item, request: 'hotlead' }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const resData = response.data;

            if (resData.status === 'success') {
                successCount++;

                if (resData.action === 'insert') insertCount++;
                if (resData.action === 'update') updateCount++;

                const linkedMsg = resData.master_data_linked
                    ? `🔗 master_data紐付け: ${resData.master_data_updated_count}件`
                    : 'master_data紐付け: なし';

                if (resData.master_data_linked) {
                    masterLinkedTotal += resData.master_data_updated_count;
                }

                console.log(`[${index + 1}/${list.length}] ID: ${item.id} 成功 (${resData.action}) | ${linkedMsg}`);
            } else {
                failCount++;
                console.error(`❌ [${index + 1}/${list.length}] ID: ${item.id} APIエラー: ${resData.message || '不明なエラー'}`);
            }

        } catch (error: any) {
            failCount++;
            const errorMsg = error.response?.data?.message || error.message;
            console.error(`❌ [${index + 1}/${list.length}] ID: ${item.id} 送信失敗: ${errorMsg}`);
        }
    }

    console.log(`\n🎉 処理完了`);
    console.log(`----------------------------------------`);
    console.log(`・成功件数              : ${successCount} 件 (新規: ${insertCount} / 更新: ${updateCount})`);
    console.log(`・失敗件数              : ${failCount} 件`);
    console.log(`・master_data紐付け合計  : ${masterLinkedTotal} 件`);
    console.log(`----------------------------------------`);
}


export async function runHotlead(id: string, pass: string) {
    try {
        console.log('認証トークンを取得中...');
        const token = await getAccessToken(id, pass);
        console.log('✅ トークン取得成功！\n');

        console.log('追客情報(Tickets)を取得・保存中...');
        const ticketsData = await findTickets(token);

        console.log('\nPHP APIへデータのPOST送信を開始します...');
        await postTicketsToPhpApi(ticketsData);

    } catch (error: any) {
        const msg = `❌ エラー発生: ${error?.message ?? error}`;
        console.error(msg);
        // 握りつぶすと失敗に気づけないため、エラーメールで通知する
        await sendErrorMail([msg], 'runHotlead.ts');
    }
}
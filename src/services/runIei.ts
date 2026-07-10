import Imap from "node-imap";
import { simpleParser } from "mailparser";
import axios from 'axios';
import { sendErrorMail } from "./sendErrorMail";

const errors: string[] = [];

// ★ 追加: 英語キーを日本語名に変換する辞書（イエイのフォーマット準拠）
const ieiColumnNameMap: Record<string, string> = {
    assessmentMethod: "査定方法",
    assessmentType: "査定種別",
    propertyType: "物件種別",
    propertyAddress: "物件所在地",
    buildingArea: "建物(専有)面積",
    landArea: "土地面積",
    floorPlan: "間取り",
    builtYear: "築年",
    currentStatus: "現況",
    rent: "賃料",
    ownership: "ご名義",
    reason: "ご依頼理由",
    saleTiming: "売却時期",
    contactDate: "連絡希望日",
    contactTime: "希望連絡時間",
    hopes: "希望など",
    requests: "ご要望など",
    name: "姓名",
    nameKana: "姓名（カナ）",
    age: "年齢",
    address: "住所",
    tel1: "電話番号1",
    tel2: "電話番号2",
    email: "E-mailアドレス",
    registered: "システム受付日時" // プログラム内で付与している日時用
};

const extractMemberData = (text: string) => {
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const extractBracket = (keyword: string) => {
        const regex = new RegExp(`［${escapeRegex(keyword)}］[\\s　]*\\n([\\s\\S]*?)(?=\\n［|\\n▼|$)`);
        const match = text.match(regex);
        return match ? match[1].trim() : "";
    };

    const nameBlock = extractBracket("姓名");
    const contactBlock = extractBracket("連絡先");

    const nameMatch = nameBlock.match(/^([^\n]+)/);
    const name = nameMatch ? nameMatch[1].trim() : "";
    const kanaMatch = nameBlock.match(/（(.*?)）/);
    const nameKana = kanaMatch ? kanaMatch[1].trim() : "";

    const tel1Match = contactBlock.match(/電話番号1：([^\n]*)/);
    const tel2Match = contactBlock.match(/電話番号2：([^\n]*)/);
    const emailMatch = contactBlock.match(/E-mailアドレス：([^\n]*)/);

    return {
        assessmentMethod: extractBracket("査定方法"),
        assessmentType: extractBracket("査定種別"),
        propertyType: extractBracket("物件種別"),
        propertyAddress: extractBracket("物件所在地"),
        buildingArea: extractBracket("建物(専有)面積"),
        landArea: extractBracket("土地面積"),
        floorPlan: extractBracket("間取り"),
        builtYear: extractBracket("築年"),
        currentStatus: extractBracket("現況"),
        rent: extractBracket("賃料"),
        ownership: extractBracket("ご名義"),
        reason: extractBracket("ご依頼理由"),
        saleTiming: extractBracket("売却時期"),
        contactDate: extractBracket("連絡希望日"),
        contactTime: extractBracket("希望連絡時間"),
        hopes: extractBracket("希望など"),
        requests: extractBracket("ご要望など"),
        name: name,
        nameKana: nameKana,
        age: extractBracket("年齢"),
        address: extractBracket("住所"),
        tel1: tel1Match ? tel1Match[1].trim() : "",
        tel2: tel2Match ? tel2Match[1].trim() : "",
        email: emailMatch ? emailMatch[1].trim() : "",
    };
};

const postToPhpApi = async (data: Record<string, string>) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        ...data,
        request: 'iei_resale_update'
    };
    try {
        const response = await axios.post(API_URL, payload, { headers: { "Content-Type": "application/json" } });
        console.log("DB登録成功:", response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(`APIエラー: ${error.response?.status} ${error.response?.statusText}`);
            console.error("エラー詳細:", error.response?.data);
        } else {
            console.error("API送信中に予期せぬエラーが発生しました:", error);
        }
        errors.push(JSON.stringify(error));
    }
};

export const runIei = async (id: string, pass: string) => {
    const processedMessageIds = new Set<string>();
    if (!process.env.GMAIL || !process.env.GMAIL_PASS) {
        throw new Error("環境変数 GMAIL または GMAIL_PASS が設定されていません。");
    }

    const imapClient = new Imap({
        user: id,
        password: pass,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        authTimeout: 30000,
        tlsOptions: { rejectUnauthorized: false }
    });

    // =========================================================
    // ★ ここを追加！: IMAPの通信切断エラー（ECONNRESET等）を受け止める
    // =========================================================
    imapClient.on("error", (err: any) => {
        console.error("IMAP通信で予期せぬエラー・切断が発生しました:", err.message);
        errors.push(`IMAP通信エラー: ${err.message}`);
        // エラーをここでキャッチするため、Heroku全体が落ちるのを防ぎます。
        // ※ 念のため、壊れた接続リソースを安全に破棄します。
        imapClient.destroy();
    });
    // =========================================================

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
        imapClient.once("ready", () => {
            imapClient.openBox("INBOX", true, (err, _) => {
                if (err) throw err;

                const searchCriteria = [
                    ["FROM", "order@sell.yeay.jp"],
                    ["SUBJECT", "イエイからの査定依頼です。"],
                    ["BODY", "下記の物件の査定依頼がありました"],
                    ["SINCE", yesterday]
                ];

                imapClient.search(searchCriteria, (err, results) => {
                    if (err) throw err;

                    if (results.length === 0) {
                        console.log("該当するメールが見つかりませんでした");
                        imapClient.end();
                        return;
                    }

                    const f = imapClient.fetch(results, { bodies: "", struct: true });

                    f.on("message", (msg, seqno) => {
                        msg.on("body", (stream) => {
                            simpleParser(stream, async (err, parsed) => {
                                if (err) return;

                                const messageId = parsed.messageId || "";
                                if (messageId && processedMessageIds.has(messageId)) {
                                    console.log(`[メール #${seqno}] 重複するMessage-IDのためスキップします: ${messageId}`);
                                    return;
                                }
                                if (messageId) {
                                    processedMessageIds.add(messageId);
                                }
                                const emailText = parsed.text || "";

                                // 抽出処理を実行
                                const extractedData = extractMemberData(emailText);

                                const d = parsed.date || new Date();
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                const hours = String(d.getHours()).padStart(2, '0');
                                const minutes = String(d.getMinutes()).padStart(2, '0');
                                const seconds = String(d.getSeconds()).padStart(2, '0');

                                const registered = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

                                const finalData: Record<string, string> = {
                                    ...extractedData,
                                    registered: registered
                                };

                                // ★ 追加: remarks（メモ）の生成処理
                                const remarksList: string[] = [];
                                for (const [key, val] of Object.entries(finalData)) {
                                    const jaKey = ieiColumnNameMap[key] || key;
                                    remarksList.push(`${jaKey}：${val}`);
                                }

                                // 最後に remarks として改行区切りで追加
                                finalData.remarks = remarksList.join('\n');

                                console.log(`[メール #${seqno}] 抽出データ:`, finalData);

                                if (finalData.name) {
                                    await postToPhpApi(finalData);
                                } else {
                                    console.log(`[メール #${seqno}] 必要なデータが抽出できなかったためスキップします。`);
                                }
                            });
                        });
                    });

                    f.once("end", () => {
                        console.log("全てのメッセージの処理が完了しました");
                        imapClient.end();
                    });
                });
            });
        });
    } catch (error) {
        errors.push(JSON.stringify(error));
    }

    imapClient.connect();
    sendErrorMail(errors, 'runHomesResales.ts');

};
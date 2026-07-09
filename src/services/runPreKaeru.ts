import Imap from "node-imap";
import { simpleParser } from "mailparser";
import axios from 'axios';
import { sendErrorMail } from "./sendErrorMail";

const errors: string[] = [];

// ★ 先取物件用の辞書に変更
const preKaeruColumnNameMap: Record<string, string> = {
    preProperties: "ご検討中の先取り物件",
    name: "お名前",
    nameKana: "フリガナ",
    email: "メールアドレス",
    tel: "電話番号",
    zip: "郵便番号",
    address: "住所",
    questions: "ご質問等",
    registered: "システム受付日時"
};

const extractPreKaeruData = (text: string) => {
    const extract = (keyword: string) => {
        // ★修正: 最後の項目が署名（--）まで巻き込まないように `\n--` を追加
        const regex = new RegExp(`【${keyword}】[\\s ]*([\\s\\S]*?)(?=\\n【|\\n--|$)`);
        const match = text.match(regex);
        return match ? match[1].trim() : "";
    };

    return {
        preProperties: extract("ご検討中の先取り物件"),
        name: extract("お名前"),
        nameKana: extract("フリガナ"),
        email: extract("メールアドレス"),
        tel: extract("電話番号"),
        zip: extract("郵便番号").replace("〒", "").trim(),
        address: extract("住所"),
        questions: extract("ご質問等"),
    };
};

const postToPhpApi = async (data: Record<string, string>) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        ...data,
        request: 'pre_kaeru_update' 
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
    }
};

export const runPreKaeru = async (id: string, pass: string) => {
    if (!process.env.GMAIL || !process.env.GMAIL_PASS) {
        throw new Error("環境変数 GMAIL または GMAIL_PASS が設定されていません。");
    }

    const imapClient = new Imap({
        user: id,
        password: pass,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
    });

    imapClient.on("error", (err: any) => {
        console.error("IMAP通信で予期せぬエラー・切断が発生しました:", err.message);
        errors.push(`IMAP通信エラー: ${err.message}`);
        imapClient.destroy();
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
        imapClient.once("ready", () => {
            imapClient.openBox("INBOX", true, (err, _) => {
                if (err) throw err;

                const searchCriteria = [
                    ["FROM", "ask@kaeruhome.jp"],
                    ["BODY", "【かえるホーム】先取物件問い合わせ"],
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

                                const emailText = parsed.text || "";
                                const extractedData = extractPreKaeruData(emailText);

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

                                const remarksList: string[] = [];
                                for (const [key, val] of Object.entries(finalData)) {
                                    const jaKey = preKaeruColumnNameMap[key] || key;
                                    remarksList.push(`${jaKey}：${val}`);
                                }

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
    sendErrorMail(errors, 'runPreKaeru.ts');
};
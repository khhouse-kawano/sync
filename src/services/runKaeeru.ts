import Imap from "node-imap";
import { simpleParser } from "mailparser";
import axios from 'axios';
import { sendErrorMail } from "./sendErrorMail";

const kaeeruColumnNameMap: Record<string, string> = {
    type: "種別",
    location: "所在地",
    area: "土地面積",
    status: "現況",
    schedule: "売却予定",
    relation: "査定対象不動産とご自身の関係",
    price: "査定額",
    name: "お名前",
    nameKana: "フリガナ",
    email: "メールアドレス",
    address: "住所",
    tel: "ご連絡先",
    registered: "メール受信日時"
};

const keywordToKeyMap: Record<string, string> = {
    "【所在地】": "location",
    "【土地面積】": "area",
    "【現況】": "status",
    "【売却予定】": "schedule",
    "【査定対象不動産とご自身の関係】": "relation",
    "【査定額】": "price",
    "【お名前】": "name",
    "【フリガナ】": "nameKana",
    "【メールアドレス】": "email",
    "【住所】": "address",
    "【ご連絡先】": "tel"
};

const extractKaeeruData = (text: string) => {
    const normalizedText = text.replace(/\r\n/g, '\n');
    const lines = normalizedText.split('\n');

    const result: Record<string, string> = {
        type: "", location: "", area: "", status: "", schedule: "",
        relation: "", price: "", name: "", nameKana: "",
        email: "", address: "", tel: ""
    };

    let currentKey = "";

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("-")) continue;

        if (trimmed.startsWith("▼種別：")) {
            result["type"] = trimmed.replace("▼種別：", "").trim();
            currentKey = "";
            continue;
        }

        if (trimmed.startsWith("【個人情報保護方針】")) {
            currentKey = "";
            continue;
        }

        let matchedKeyword = false;
        for (const [kw, key] of Object.entries(keywordToKeyMap)) {
            if (trimmed.startsWith(kw)) {
                currentKey = key;
                matchedKeyword = true;
                break;
            }
        }

        if (matchedKeyword) continue;

        if (currentKey && trimmed !== "") {
            result[currentKey] = result[currentKey] ? `${result[currentKey]} ${trimmed}` : trimmed;
        }
    }

    if (result.address) result.address = result.address.replace(/〒\s*/g, "").trim();
    if (result.tel) result.tel = result.tel.replace("携帯電話 ：", "").trim();

    return result;
};

const postToPhpApi = async (data: Record<string, string>) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        ...data,
        request: 'kaeeru_update'
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

export const runKaeeru = async (id: string, pass: string) => {
    const errors: string[] = [];
    const processedMessageIds = new Set<string>();

    if (!id || !pass) {
        console.error("GmailのログインIDまたはパスワードが渡されていません。");
        return;
    }

    const imapClient = new Imap({
        user: id,
        password: pass,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        authTimeout: 10000, // ★ 認証タイムアウトを10秒に延長
        tlsOptions: { rejectUnauthorized: false } // クラッシュ防止のTLS緩和策
    });

    // エラーハンドラ（落ちないように安全に破棄）
    imapClient.on("error", (err: any) => {
        console.error("IMAP通信で予期せぬエラー・切断が発生しました:", err.message);
        errors.push(`IMAP通信エラー: ${err.message}`);
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
        imapClient.once("ready", () => {
            imapClient.openBox("INBOX", true, (err, _) => {
                if (err) {
                    console.error("INBOXオープンエラー:", err.message);
                    imapClient.end();
                    return;
                }

                const searchCriteria = [
                    ["FROM", "ask@kae-ru.jp"],
                    ["SUBJECT", "不動産売却 実査定依頼"],
                    ["SINCE", yesterday]
                ];

                imapClient.search(searchCriteria, (err, results) => {
                    if (err) {
                        console.error("メール検索エラー:", err.message);
                        imapClient.end();
                        return;
                    }

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
                                const extractedData = extractKaeeruData(emailText);

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

                                if (!finalData.location || !finalData.location.includes("鹿児島")) {
                                    console.log(`[メール #${seqno}] 所在地に「鹿児島」が含まれていないためスキップします。`);
                                    return;
                                }

                                const remarksList: string[] = [];
                                for (const [key, val] of Object.entries(finalData)) {
                                    if (val) {
                                        const jaKey = kaeeruColumnNameMap[key] || key;
                                        remarksList.push(`${jaKey}：${val}`);
                                    }
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

        imapClient.connect();
    } catch (error: any) {
        console.error("runKaeeru 実行エラー:", error.message);
    }
};
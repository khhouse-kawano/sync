import Imap from "node-imap";
import { simpleParser } from "mailparser";
import axios from 'axios';
import { sendErrorMail } from "./sendErrorMail";
const errors: string[] = [];

// 英語キーを日本語名に変換する辞書 (remarks生成用)
const catalogResaleColumnNameMap: Record<string, string> = {
    catalog_request: "資料請求",
    visit_reservation: "見学予約",
    name: "お名前",
    nameKana: "フリガナ",
    email: "メールアドレス",
    tel: "ご連絡先お電話番号",
    zip: "郵便番号",
    address: "ご住所",
    property: "資料請求対象不動産",
    registered: "メール受信日時"
};

// 表記揺れ・項目名と内部キーのマッピング辞書
const keywordToKeyMap: Record<string, string> = {
    "【資料請求】": "catalog_request",
    "【見学予約】": "visit_reservation",
    "【お名前】": "name",
    "【フリガナ】": "nameKana",
    "【メールアドレス】": "email",
    "【ご連絡先お電話番号】": "tel",
    "【郵便番号】": "zip",
    "【ご住所】": "address",
    "【資料請求対象不動産】": "property"
};

const extractCatalogData = (text: string) => {
    const normalizedText = text.replace(/\r\n/g, '\n');
    const lines = normalizedText.split('\n');

    // 初期オブジェクトの準備
    const result: Record<string, string> = {
        catalog_request: "", visit_reservation: "", name: "", nameKana: "",
        email: "", tel: "", zip: "", address: "", property: ""
    };

    let currentKey = "";
    let expectValueNextLine = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("--") || trimmed.startsWith("【個人情報保護方針】")) break; // 不要な後半は終了

        // 1. 行頭が【項目名】のいずれかに一致するかチェック
        let matchedKeyword = false;
        for (const [kw, key] of Object.entries(keywordToKeyMap)) {
            if (trimmed.startsWith(kw)) {
                currentKey = key;
                expectValueNextLine = true; // 次の行に値が来るとフラグを立てる
                matchedKeyword = true;
                break;
            }
        }

        if (matchedKeyword) continue;

        // 2. 値の回収処理
        if (currentKey) {
            if (expectValueNextLine) {
                if (trimmed !== "") {
                    result[currentKey] = trimmed;
                    // property（対象不動産）以外は1行完結ガード！
                    if (currentKey !== 'property') {
                        currentKey = "";
                    }
                    expectValueNextLine = false;
                }
            } else if (currentKey === 'property' && trimmed !== "") {
                // property（対象不動産）の時だけは、住所やURLなど複数行の追記を許可する
                result[currentKey] = result[currentKey] ? `${result[currentKey]}\n${trimmed}` : trimmed;
            }
        }
    }

    // データのクリーニング処理
    if (result.zip) result.zip = result.zip.replace("〒", "").trim();

    return result;
};

const postToPhpApi = async (data: Record<string, string>) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        ...data,
        request: 'catalog_resale_update'
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

export const runCatalogResale = async (id: string, pass: string) => {
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

    imapClient.on('error', (err) => {
        console.error('IMAPエラーが発生しました:', err);
        errors.push(`IMAP接続エラー: ${err}`);
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
        imapClient.once("ready", () => {
            imapClient.openBox("INBOX", true, (err, _) => {
                if (err) throw err;

                // 検索条件（※実態に合わせて調整してください）
                const searchCriteria = [
                    ["FROM", "ask@chuko-senmon.jp"],
                    ["SUBJECT", "資料請求"],
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
                                const extractedData = extractCatalogData(emailText);

                                // 実際のメール受信日時を取得
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

                                // remarks（メモ）の生成処理
                                const remarksList: string[] = [];
                                for (const [key, val] of Object.entries(finalData)) {
                                    if (val) {
                                        const jaKey = catalogResaleColumnNameMap[key] || key;
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
    } catch (error) {
        errors.push(JSON.stringify(error));
    }

    imapClient.connect();
};
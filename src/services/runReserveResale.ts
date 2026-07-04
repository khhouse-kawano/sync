import Imap from "node-imap";
import { simpleParser } from "mailparser";
import axios from 'axios';
import { sendErrorMail } from "./sendErrorMail";
const errors: string[] = [];

// 英語キーを日本語名に変換する辞書 (remarks生成用)
const reserveResaleColumnNameMap: Record<string, string> = {
    event: "ご希望イベント/物件番号",
    date: "ご来店・参加希望日",
    time: "ご来店・参加希望時間",
    name: "お名前",
    nameKana: "フリガナ",
    email: "メールアドレス",
    tel: "お電話番号",
    zip: "郵便番号",
    address: "ご住所",
    source: "ご予約のきっかけ",
    note: "その他お問い合わせ",
    registered: "メール受信日時"
};

// 表記揺れを吸収するための日本語キーワードと内部キーのマッピング辞書
const keywordToKeyMap: Record<string, string> = {
    "【ご希望イベント1】": "event",
    "【ご希望の物件番号】": "event",
    "【参加希望日】": "date",
    "【ご来店希望日】": "date",
    "【参加希望時間】": "time",
    "【ご来店希望時間】": "time",
    "【お名前】": "name",
    "【フリガナ】": "nameKana",
    "【メールアドレス】": "email",
    "【お電話番号】": "tel",
    "【郵便番号】": "zip",
    "【ご住所】": "address",
    "【ご予約のきっかけ】": "source",
    "【その他お問い合わせ】": "note",
    "【その他】": "note"
};

const extractResaleData = (text: string) => {
    const normalizedText = text.replace(/\r\n/g, '\n');
    const lines = normalizedText.split('\n');

    // 初期オブジェクトの準備
    const result: Record<string, string> = {
        event: "", date: "", time: "", name: "", nameKana: "",
        email: "", tel: "", zip: "", address: "", source: "", note: ""
    };

    let currentKey = "";
    let expectValueNextLine = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("--")) break;

        let matchedKeyword = false;
        for (const [kw, key] of Object.entries(keywordToKeyMap)) {
            if (trimmed.startsWith(kw)) {
                currentKey = key;
                expectValueNextLine = true;
                matchedKeyword = true;
                break;
            }
        }

        if (matchedKeyword) continue;

        if (currentKey) {
            if (expectValueNextLine) {
                if (trimmed !== "") {
                    result[currentKey] = trimmed;
                    if (currentKey !== 'note') {
                        currentKey = "";
                    }
                    expectValueNextLine = false;
                }
            } else if (currentKey === 'note' && trimmed !== "") {
                result[currentKey] = result[currentKey] ? `${result[currentKey]}\n${trimmed}` : trimmed;
            }
        }
    }

    // データのクリーニング処理
    if (result.zip) result.zip = result.zip.replace("〒", "").trim();

    // ★ 修正: イベント/物件番号が取得できなかった（空文字、null、undefined）場合のデフォルト値設定
    if (!result.event || result.event.trim() === "") {
        result.event = "ホームページ来場予約";
    }

    return result;
};

const postToPhpApi = async (data: Record<string, string>) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        ...data,
        request: 'reserve_resale_update' // ★後ほどPHP側と合わせる識別子
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

export const runReserveResale = async (id: string, pass: string) => {
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

                // ★ 検索条件（FROMやSUBJECTは実態に合わせて調整してください）
                const searchCriteria = [
                    ["FROM", "ask@chuko-senmon.jp"],
                    ["OR", ["SUBJECT", "イベント"], ["SUBJECT", "来店予約"]],
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
                                const extractedData = extractResaleData(emailText);

                                // ★ 前回同様、実際のメールの受信日時（parsed.date）を使用
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
                                        const jaKey = reserveResaleColumnNameMap[key] || key;
                                        remarksList.push(`${jaKey}：${val}`);
                                    }
                                }
                                finalData.remarks = remarksList.join('\n');

                                console.log(`[メール #${seqno}] 抽出データ:`, finalData);

                                // 必須項目（お名前）が取れている場合のみPOST
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
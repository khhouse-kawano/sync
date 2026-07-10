import Imap from "node-imap";
import { simpleParser } from "mailparser";
import axios from 'axios';
import { sendErrorMail } from "./sendErrorMail";
const errors: string[] = [];

// 英語キーを日本語名に変換する辞書 (remarks生成用)
const reserveKaeruColumnNameMap: Record<string, string> = {
    area: "お探しのエリア",
    date: "ご来場希望日",
    time: "ご来場希望時間",
    name: "お名前",
    nameKana: "フリガナ",
    age: "ご年齢",
    email: "メールアドレス",
    tel: "電話番号",
    zip: "郵便番号",
    address: "住所",
    event: "参加イベント",
    source: "認知媒体",
    purpose: "当日したいこと",
    note: "ご意見・ご質問",
    registered: "システム受付日時"
};

// ★ 表記揺れを吸収するための日本語キーワードと内部キーのマッピング辞書
const keywordToKeyMap: Record<string, string> = {
    "お探しのエリア": "area",
    "ご希望日": "date",
    "ご来場希望日": "date",
    "ご希望時間": "time",
    "ご来場希望時間": "time",
    "お名前": "name",
    "フリガナ": "nameKana",
    "ご年齢": "age",
    "メールアドレス": "email",
    "電話番号": "tel",
    "お電話番号": "tel",
    "郵便番号": "zip",
    "住所": "address",
    "ご住所": "address",
    "参加イベント": "event",
    "何を見てかえるホームをお知りになりましたか？": "source",
    "当日したいこと": "purpose",
    "上記以外のご意見・ご質問": "note"
};

const extractReserveData = (text: string) => {
    const normalizedText = text.replace(/\r\n/g, '\n');
    const lines = normalizedText.split('\n');

    // 初期オブジェクトの準備（メールに存在しない項目はデフォルトで空文字になります）
    const result: Record<string, string> = {
        area: "", date: "", time: "", name: "", nameKana: "",
        age: "", email: "", tel: "", zip: "", address: "",
        event: "", source: "", purpose: "", note: ""
    };

    let currentKey = "";

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue; // 空行はスルー
        if (trimmed.startsWith("--")) break; // メールのフッター（署名）以降は終了

        let matched = false;

        // コロンの有無や全角半角に関わらず、キーワードで始まっていれば検知
        for (const [kw, key] of Object.entries(keywordToKeyMap)) {
            if (trimmed.startsWith(kw)) {
                currentKey = key;
                // キーワード部分と、それに続くコロン(全角/半角)やスペースを削除して値だけを抽出
                const val = trimmed.substring(kw.length).replace(/^[：:\s]+/, '').trim();
                result[currentKey] = val;
                matched = true;
                break;
            }
        }

        // キーワードに該当しない行の処理
        if (!matched) {
            if (currentKey === 'note') {
                // 「上記以外のご意見・ご質問（note）」の時だけ、複数行の入力を許可して追記する
                result[currentKey] = result[currentKey] ? `${result[currentKey]}\n${trimmed}` : trimmed;
            } else {
                // それ以外の項目は1行完結！
                currentKey = "";
            }
        }
    }

    // データのクリーニング処理
    if (result.age) result.age = result.age.replace("歳", "").trim();
    if (result.zip) result.zip = result.zip.replace("〒", "").trim();

    // ★ 追加: イベント名が取得できなかった（空文字、null、undefined）場合のデフォルト値設定
    if (!result.event || result.event.trim() === "") {
        result.event = "ホームページ来場予約";
    }

    return result;
};

const postToPhpApi = async (data: Record<string, string>) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        ...data,
        request: 'reserve_kaeru_update'
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

export const runReserveKaeru = async (id: string, pass: string) => {
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
                    ["FROM", "ask@kaeruhome.jp"],
                    ["SUBJECT", "来場予約"],
                    ["BODY", "◆◇かえるホームに"],
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
                                const extractedData = extractReserveData(emailText);

                                // ★ 修正: 実際のメールの受信日時（parsed.date）から正確に「YYYY-MM-DD HH:mm:ss」を生成
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
                                        const jaKey = reserveKaeruColumnNameMap[key] || key;
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
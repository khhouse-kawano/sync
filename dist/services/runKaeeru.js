"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKaeeru = void 0;
const node_imap_1 = __importDefault(require("node-imap"));
const mailparser_1 = require("mailparser");
const axios_1 = __importDefault(require("axios"));
const errors = [];
// 英語キーを日本語名に変換する辞書 (remarks生成用) ※個人情報は除外
const kaeeruColumnNameMap = {
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
// 表記揺れを吸収するための日本語キーワードと内部キーのマッピング辞書 ※個人情報は除外
const keywordToKeyMap = {
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
const extractKaeeruData = (text) => {
    const normalizedText = text.replace(/\r\n/g, '\n');
    const lines = normalizedText.split('\n');
    // 初期オブジェクトの準備 (個人情報保護方針の枠を削除)
    const result = {
        type: "", location: "", area: "", status: "", schedule: "",
        relation: "", price: "", name: "", nameKana: "",
        email: "", address: "", tel: ""
    };
    let currentKey = "";
    for (const line of lines) {
        const trimmed = line.trim();
        // 区切り線は無視
        if (trimmed.startsWith("-"))
            continue;
        // ▼種別 は特殊フォーマットなので個別対応
        if (trimmed.startsWith("▼種別：")) {
            result["type"] = trimmed.replace("▼種別：", "").trim();
            currentKey = "";
            continue;
        }
        // 個人情報保護方針が来た場合は以降のキー取得を無視する（あるいはそのままスキップ）
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
        // キーワード行ならスキップし、次の行から値を取得
        if (matchedKeyword)
            continue;
        // 現在のキーが設定されており、かつ空行でなければ値を追加
        if (currentKey && trimmed !== "") {
            // 住所などが複数行になる場合を考慮し、スペース区切り等で連結
            result[currentKey] = result[currentKey] ? `${result[currentKey]} ${trimmed}` : trimmed;
        }
    }
    // データのクリーニング処理
    if (result.address)
        result.address = result.address.replace(/〒\s*/g, "").trim();
    if (result.tel)
        result.tel = result.tel.replace("携帯電話 ：", "").trim();
    return result;
};
const postToPhpApi = async (data) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/"; // ※適切なAPI URLに変更してください
    const payload = {
        ...data,
        request: 'kaeeru_update' // ★後ほどPHP側と合わせる識別子
    };
    try {
        const response = await axios_1.default.post(API_URL, payload, { headers: { "Content-Type": "application/json" } });
        console.log("DB登録成功:", response.data);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error(`APIエラー: ${error.response?.status} ${error.response?.statusText}`);
            console.error("エラー詳細:", error.response?.data);
        }
        else {
            console.error("API送信中に予期せぬエラーが発生しました:", error);
        }
    }
};
const runKaeeru = async (id, pass) => {
    const processedMessageIds = new Set();
    if (!process.env.GMAIL || !process.env.GMAIL_PASS) {
        throw new Error("環境変数 GMAIL または GMAIL_PASS が設定されていません。");
    }
    const imapClient = new node_imap_1.default({
        user: id,
        password: pass,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
    });
    imapClient.on("error", (err) => {
        console.error("IMAP通信で予期せぬエラー・切断が発生しました:", err.message);
        errors.push(`IMAP通信エラー: ${err.message}`);
        imapClient.destroy();
    });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    try {
        imapClient.once("ready", () => {
            imapClient.openBox("INBOX", true, (err, _) => {
                if (err)
                    throw err;
                // ★ 検索条件 (適宜変更してください)
                const searchCriteria = [
                    ["FROM", "ask@kae-ru.jp"],
                    ["SUBJECT", "不動産売却 実査定依頼"],
                    ["SINCE", yesterday]
                ];
                imapClient.search(searchCriteria, (err, results) => {
                    if (err)
                        throw err;
                    if (results.length === 0) {
                        console.log("該当するメールが見つかりませんでした");
                        imapClient.end();
                        return;
                    }
                    const f = imapClient.fetch(results, { bodies: "", struct: true });
                    f.on("message", (msg, seqno) => {
                        msg.on("body", (stream) => {
                            (0, mailparser_1.simpleParser)(stream, async (err, parsed) => {
                                if (err)
                                    return;
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
                                // 日時データの取得
                                const d = parsed.date || new Date();
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                const hours = String(d.getHours()).padStart(2, '0');
                                const minutes = String(d.getMinutes()).padStart(2, '0');
                                const seconds = String(d.getSeconds()).padStart(2, '0');
                                const registered = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                                const finalData = {
                                    ...extractedData,
                                    registered: registered
                                };
                                // ★ 鹿児島縛りについては、前回の要件に従い残していますが、サンプルの宮崎県を処理したい場合はこのブロックを削除・変更してください。
                                if (!finalData.location || !finalData.location.includes("鹿児島")) {
                                    console.log(`[メール #${seqno}] 所在地に「鹿児島」が含まれていないためスキップします。`);
                                    return;
                                }
                                // remarks（メモ）の生成処理
                                const remarksList = [];
                                for (const [key, val] of Object.entries(finalData)) {
                                    if (val) {
                                        const jaKey = kaeeruColumnNameMap[key] || key;
                                        remarksList.push(`${jaKey}：${val}`);
                                    }
                                }
                                finalData.remarks = remarksList.join('\n');
                                console.log(`[メール #${seqno}] 抽出データ:`, finalData);
                                // お名前が取れている場合のみPOST
                                if (finalData.name) {
                                    await postToPhpApi(finalData);
                                }
                                else {
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
    }
    catch (error) {
        errors.push(JSON.stringify(error));
    }
    imapClient.connect();
};
exports.runKaeeru = runKaeeru;

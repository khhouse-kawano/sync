"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHomesResale = void 0;
const node_imap_1 = __importDefault(require("node-imap"));
const mailparser_1 = require("mailparser");
const axios_1 = __importDefault(require("axios"));
// ★ 追加: 英語キーを日本語名に変換する辞書（HOMESのフォーマット準拠）
const homesColumnNameMap = {
    userUrl: "ユーザー詳細URL",
    propertyUrl: "物件詳細URL",
    category: "物件種別",
    propertyName: "物件名",
    price: "価格",
    area: "所在地",
    railway: "交通",
    large: "面積",
    plan: "間取",
    propertyId: "物件番号",
    companyId: "自社管理番号",
    userId: "問合せ番号",
    name: "名前",
    mail: "メールアドレス",
    mobile: "電話番号",
    note: "お問合せ内容",
    registered: "システム受付日時" // プログラム内で付与している日時用
};
const extractHomesData = (text) => {
    const extract = (regex) => (text.match(regex)?.[1] || "").trim();
    return {
        userUrl: extract(/▼ユーザーの詳細データ\s+(https:\/\/[^\s]+)/),
        propertyUrl: extract(/下記URLをクリックすると問合せ物件の詳細を見ることができます。\s+(https:\/\/[^\s]+)/),
        category: extract(/物件種別：(.*)/),
        propertyName: extract(/物件名：(.*)/),
        price: extract(/価格：(.*)/),
        area: extract(/所在地：(.*)/),
        railway: extract(/交通：(.*)/),
        large: extract(/面積：(.*)/),
        plan: extract(/間取：(.*)/),
        propertyId: extract(/物件番号：(.*)/),
        companyId: extract(/自社管理番号：(.*)/),
        userId: extract(/問合せ番号：(.*)/),
        name: extract(/名前：(.*)/),
        mail: extract(/メールアドレス：(.*)/),
        mobile: extract(/電話番号：(.*)/),
        note: extract(/お問合せ内容：(.*)/),
    };
};
const postToPhpApi = async (data) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        ...data,
        request: 'homes_db_resale'
    };
    try {
        // ★修正: "Content-Type" に直しています
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
const runHomesResale = async (id, pass) => {
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
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    imapClient.once("ready", () => {
        imapClient.openBox("INBOX", true, (err, _) => {
            if (err)
                throw err;
            const searchCriteria = [
                ["FROM", "support@homes.co.jp"],
                ["SUBJECT", "お客様からの問合せ"],
                ["BODY", "株式会社国分ハウジング不動産　中古住宅専門店様"],
                ["SINCE", twoDaysAgo]
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
                            const emailText = parsed.text || "";
                            const extractedData = extractHomesData(emailText);
                            // ==========================================
                            // ★追加: メールの受信日時を取得し、YYYY-MM-DD HH:mm:ss 形式に整形
                            // ==========================================
                            const d = parsed.date || new Date(); // parsed.date が無い場合は現在時刻
                            const year = d.getFullYear();
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            const hours = String(d.getHours()).padStart(2, '0');
                            const minutes = String(d.getMinutes()).padStart(2, '0');
                            const seconds = String(d.getSeconds()).padStart(2, '0');
                            const registered = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                            // 抽出データと日時(registered)を合体させる
                            const finalData = {
                                ...extractedData,
                                registered: registered
                            };
                            // ★ 追加: remarks（メモ）の生成処理
                            const remarksList = [];
                            for (const [key, val] of Object.entries(finalData)) {
                                const jaKey = homesColumnNameMap[key] || key;
                                remarksList.push(`${jaKey}：${val}`);
                            }
                            // 最後に remarks として改行区切りで追加
                            finalData.remarks = remarksList.join('\n');
                            console.log(`[メール #${seqno}] 抽出データ:`, finalData);
                            // 合体させた finalData をAPIに送る
                            if (finalData.propertyId && finalData.userId) {
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
    imapClient.connect();
};
exports.runHomesResale = runHomesResale;

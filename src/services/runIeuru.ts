import Imap from "node-imap";
import { simpleParser } from "mailparser";
import axios from 'axios';
import { sendErrorMail } from "./sendErrorMail";

const errors: string[] = [];
// ★ 追加: 英語キーを日本語名に変換する辞書
// ★ 追加: 英語キーを日本語名に変換する辞書（イエウール全項目対応版）
const memberColumnNameMap: Record<string, string> = {
    // --- ユーザ情報 ---
    email: "メールアドレス",
    name: "お名前",
    nameKana: "フリガナ",
    age: "年齢",
    address: "住所",
    mobile: "電話番号",
    preferredContactTime: "希望連絡時間",
    reasonForAssessment: "査定理由",
    requestsToCompany: "査定会社への要望",
    replacementFlag: "買い替え有無",
    assessmentMethod: "査定方法",
    comment: "コメント",

    // --- 査定依頼情報 ---
    requestDate: "依頼日時",
    concurrentAssessments: "同時査定社数",

    // --- 不動産情報 ---
    propertyType: "物件種別",
    propertyAddress: "物件住所",
    mansionName: "マンション名",
    roomNumber: "部屋番号",
    buildingName: "建物名",
    exclusiveArea: "専有面積",
    buildingArea: "建物面積",
    landArea: "土地面積",
    totalFloorArea: "延べ床面積",
    floorPlan: "間取り",
    buildingAge: "築年数",
    propertyStatus: "物件の状況",
    relationshipToProperty: "物件との関係",

    // --- その他詳細アンケート情報 ---
    ownershipPeriod: "所有年数",
    surroundingEnvironment: "周辺環境",
    buildingStructure: "建物構造",
    roadFrontage: "接面状況",
    propertyAppeal: "おうちの魅力",
    purchaseAssessment: "買取査定",
    assessmentAmountHighAndFast: "「高く売った場合」と「早く売った場合」の査定額",
    priceMovement: "過去～将来の値動き",
    amountAfterTaxes: "査定額から税金を引いた手元に残る金額",
    concerns: "気になること",
    whatToDoIfSoldHigher: "予想より高く売れたら何がしたいか",

    // --- システム用 ---
    registered: "システム受付日時"
};

const extractCustomerData = (text: string) => {
    // イエウールのフォーマット（項目名 : 値 または 項目名：値）に対応した抽出関数
    // キーワードの後のスペースや全角・半角コロンを考慮し、その後ろから行末までを取得します
    const extract = (keyword: string) => {
        const regex = new RegExp(`${keyword}[\\s ]*[:：][\\s ]*(.*)`);
        const match = text.match(regex);
        return match ? match[1].trim() : "";
    };

    return {
        // --- ユーザ情報 ---
        email: extract("Email"),
        name: extract("氏名"),
        nameKana: extract("フリガナ"),
        age: extract("年齢"),
        address: extract("住所"),
        mobile: extract("電話番号"),
        preferredContactTime: extract("希望連絡時間"),
        reasonForAssessment: extract("査定理由"),
        requestsToCompany: extract("査定会社への要望"),
        replacementFlag: extract("買い替え有無"),
        assessmentMethod: extract("査定方法"),
        comment: extract("コメント"),

        // --- 査定依頼情報 ---
        requestDate: extract("依頼日時"),
        concurrentAssessments: extract("同時査定社数"),

        // --- 不動産情報 ---
        propertyType: extract("物件種別"),
        propertyAddress: extract("物件住所"),
        mansionName: extract("マンション名"),
        roomNumber: extract("部屋番号"),
        buildingName: extract("建物名"),
        exclusiveArea: extract("専有面積"),
        buildingArea: extract("建物面積"),
        landArea: extract("土地面積"),
        totalFloorArea: extract("延べ床面積"),
        floorPlan: extract("間取り"),
        buildingAge: extract("築年数"),
        propertyStatus: extract("物件の状況"),
        relationshipToProperty: extract("物件との関係"),

        // --- その他詳細アンケート情報（全角コロン：の形式） ---
        ownershipPeriod: extract("所有年数"),
        surroundingEnvironment: extract("周辺環境"),
        buildingStructure: extract("建物構造"),
        roadFrontage: extract("接面状況"),
        propertyAppeal: extract("おうちの魅力"),
        purchaseAssessment: extract("買取査定"),
        assessmentAmountHighAndFast: extract("「高く売った場合」と「早く売った場合」の査定額"),
        priceMovement: extract("過去～将来の値動き"),
        amountAfterTaxes: extract("査定額から税金を引いた手元に残る金額"),
        concerns: extract("気になること"),
        whatToDoIfSoldHigher: extract("予想より高く売れたら何がしたいか"),
    };
};

const postToPhpApi = async (data: Record<string, string>) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        ...data,
        request: 'ieuru_resale_update'
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

export const runIeuru = async (id: string, pass: string) => {
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
                    ["FROM", "ieul-support@ieul.jp"],
                    ["SUBJECT", "【イエウール】不動産査定依頼のお知らせ"],
                    ["BODY", "株式会社国分ハウジング不動産 中古住宅専門店"],
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

                                const extractedData = extractCustomerData(emailText);

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
                                    const jaKey = memberColumnNameMap[key] || key;
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
    sendErrorMail(errors, 'runIeuru.ts');

};
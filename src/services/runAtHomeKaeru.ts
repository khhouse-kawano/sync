import Imap from "node-imap";
import { simpleParser } from "mailparser";
import axios from 'axios';
import { sendErrorMail } from "./sendErrorMail";
const errors: string[] = [];


// ★ 追加: 英語キーを日本語名に変換する辞書
const athomeColumnNameMap: Record<string, string> = {
    inquiryDate: "お問合わせ日時",
    propertyType: "物件種目",
    buildingName: "建物名",
    transportation: "交通",
    station: "駅名",
    walkMinutes: "徒歩",
    busStop: "バス停名",
    busRideMinutes: "バス乗車分",
    busWalkMinutes: "バス停歩分",
    propertyAddress: "所在地",
    price: "価格",
    floorPlan: "間取り",
    buildingArea: "専有・建物面積",
    landArea: "土地面積",
    athomePropertyId: "at home 物件番号",
    companyPropertyId: "貴社物件管理番号",
    name: "お名前",
    email: "メールアドレス",
    zip: "郵便番号",
    address: "住所",
    tel: "電話番号",
    contactTime: "連絡希望の時間帯",
    otherContactMethod: "その他の連絡方法",
    gender: "性別",
    moveInTiming: "入居希望時期",
    tourDate1: "第一希望日時",
    registered: "システム受付日時" // プログラム内で付与している日時用
};

const extractAthomeData = (text: string) => {
    const extract = (keyword: string) => {
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`${escapedKeyword}[ \\t　]*[：:][ \\t　]*([^\\n]*)`);

        const match = text.match(regex);
        return match ? match[1].trim() : "";
    };

    return {
        inquiryDate: extract("お問合わせ日時"),
        propertyType: extract("物件種目"),
        buildingName: extract("建物名"),
        transportation: extract("交通"),
        station: extract("駅名"),
        walkMinutes: extract("徒歩"),
        busStop: extract("バス停名"),
        busRideMinutes: extract("バス乗車分"),
        busWalkMinutes: extract("バス停歩分"),
        propertyAddress: extract("所在地"),
        price: extract("価格"),
        floorPlan: extract("間取り"),
        buildingArea: extract("専有・建物面積"),
        landArea: extract("土地面積"),
        athomePropertyId: extract("at home 物件番号") || extract("athome物件番号"),
        companyPropertyId: extract("貴社物件管理番号"),
        name: extract("お名前"),
        email: extract("メールアドレス"),
        zip: extract("郵便番号"),
        address: extract("住所"),
        tel: extract("電話番号"),
        contactTime: extract("連絡希望の時間帯"),
        otherContactMethod: extract("その他の連絡方法"),
        gender: extract("性別"),
        moveInTiming: extract("入居希望時期"),
        tourDate1: extract("第一希望日時"),
    };
};

const postToPhpApi = async (data: Record<string, string>) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        ...data,
        request: 'athome_kaeru_update'
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

export const runAthomeKaeru = async (id: string, pass: string) => {
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
                    ["FROM", "mailtofax@athome.jp"],
                    ["SUBJECT", "アットホーム（スマートフォンサイト・アプリ）からのお知らせ"],
                    ["BODY", "国分ハウジング不動産 御中"],
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

                                const extractedData = extractAthomeData(emailText);

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
                                    // 空の値は飛ばしたい場合はここのコメントアウトを外してください
                                    // if (!val) continue; 

                                    const jaKey = athomeColumnNameMap[key] || key;
                                    remarksList.push(`${jaKey}：${val}`);
                                }

                                // 最後に remarks として改行区切りで追加
                                finalData.remarks = remarksList.join('\n');

                                console.log(`[メール #${seqno}] 抽出データ:`, finalData);

                                if (finalData.name || finalData.email) {
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
    await sendErrorMail(errors, 'runAtHomeKaeru.ts');
};
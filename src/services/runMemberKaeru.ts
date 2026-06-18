import Imap from "node-imap";
import { simpleParser } from "mailparser";
import axios from 'axios';

// ★ 追加: 英語キーを日本語名に変換する辞書
const memberKaeruColumnNameMap: Record<string, string> = {
    email: "メールアドレス",
    name: "お名前",
    nameKana: "フリガナ",
    zip: "郵便番号",
    address: "住所",
    age: "ご年齢",
    tel: "電話番号",
    mobile: "携帯番号",
    source: "当サイトをどこでお知りになりましたか？",
    desiredArea1: "第一希望エリア",
    desiredArea2: "第二希望エリア",
    desiredArea3: "第三希望エリア",
    areaNotes: "※市区町村、学区など",
    otherConditions: "その他希望条件",
    registered: "システム受付日時" // プログラム内で付与している日時用
};

const extractMemberData = (text: string) => {
    const extract = (keyword: string) => {
        const regex = new RegExp(`【${keyword}】[\\s　]*([\\s\\S]*?)(?=\\n【|$)`);
        const match = text.match(regex);
        return match ? match[1].trim() : "";
    };

    const conditionsText = extract("ご希望条件");

    const extractCondition = (keyword: string) => {
        // 「・キーワード」の直後から、次の「・」が来るまで（または文末まで）を取得
        const regex = new RegExp(`・${keyword}[\\s　]*([\\s\\S]*?)(?=\\n[\\s　]*・|$)`);
        const match = conditionsText.match(regex);
        return match ? match[1].trim() : "";
    };

    return {
        email: extract("メールアドレス"),
        name: extract("お名前"),
        nameKana: extract("フリガナ"),
        // ★修正ポイント: 「〒」を取り除く
        zip: extract("郵便番号").replace("〒", "").trim(),
        address: extract("住所"),
        // ★修正ポイント: 「歳」を取り除く
        age: extract("ご年齢").replace("歳", "").trim(),
        tel: extract("電話番号"),
        mobile: extract("携帯番号"), // 今回のメール文面にはありませんが、他パターン用として残しています
        source: extract("当サイトをどこでお知りになりましたか？"),
        // ★追加ポイント: ご希望条件の中身をそれぞれ抽出
        desiredArea1: extractCondition("第一希望エリア"),
        desiredArea2: extractCondition("第二希望エリア"),
        desiredArea3: extractCondition("第三希望エリア"),
        areaNotes: extractCondition("※市区町村、学区など"),
        otherConditions: extractCondition("その他希望条件"),
    };
};

const postToPhpApi = async (data: Record<string, string>) => {
    const API_URL = "https://khg-marketing.info/dashboard/api/gateway/";
    const payload = {
        ...data,
        request: 'member_kaeru_update'
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

export const runMemberKaeru = async (id: string, pass: string) => {
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

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);


    imapClient.once("ready", () => {
        imapClient.openBox("INBOX", true, (err, _) => {
            if (err) throw err;

            const searchCriteria = [
                ["FROM", "ask@kaeruhome.jp"],
                ["SUBJECT", "新規会員登録発生通知メール"],
                ["BODY", "かえるホームの新規会員登録情報"],
                ["SINCE", twoDaysAgo]
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
                                const jaKey = memberKaeruColumnNameMap[key] || key;
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

    imapClient.connect();
};
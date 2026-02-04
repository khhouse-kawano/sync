import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import {toImapDate } from '../utils/function';
import {extractLetter} from '../utils/extractLetter'
import { shopList } from '../utils/shopList';

export const runMailScraping = async () => {
    const imapClient = new Imap({
        user: process.env.GMAIL ?? '',
        password: process.env.GMAIL_PASS ?? '',
        host: 'imap.gmail.com',
        port: 993,
        tls: true
    });

    const closeConnection = () => {
        try {
            imapClient.end();
        } catch (e) {
            console.error('接続終了時にエラー:', e);
        }
    };

    imapClient.once('error', (err) => {
        console.error('接続に失敗しました:', err);
        closeConnection();
    });

    imapClient.once('ready', () => {
        console.log('接続に成功しました！');

        imapClient.openBox('INBOX', true, (err) => {
            if (err) {
                console.error('openBox エラー:', err);
                return closeConnection();
            }

            const now = new Date();
            const threeDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
            const targetDate = toImapDate(threeDaysAgo);

            const searchList = [
                // { target: '土地新着ネット', title: '新規会員登録発生通知メール', mail: 'ask@tochi-shinchaku.net' },
                // { target: 'KH会員登録', title: '会員登録がありました', mail: 'kh-t@kh-house.jp' },
                // { target: 'JH会員登録', title: '会員登録がありました', mail: 'wordpress@jusfy-home.com' },
                // { target: 'なごみ会員登録', title: '会員登録がありました', mail: 'wordpress@nagomi-koumuten.jp' },
                // { target: '事前アンケート', title: '事前アンケートへの回答がありました', mail: 'pgcloud@khg-marketing.info' },
                // { target: '2L会員登録', title: '会員登録がありました', mail: 'noreply@2lhome.net' },
                // { target: 'カゴスマ資料請求', title: '資料送付お願いいたします', mail: 'zono@mikataga.jp' },
                // { target: 'カゴスマ来場予約', title: 'イベント参加リクエストご対応依頼', mail: 'zono@mikataga.jp' },
                { target: 'ハウジングバザール', title: 'お問い合わせがありました', mail: 'bazar@g-rexjapan.co.jp' },
            ];

            const searchObject = [
                {
                    target: '土地新着ネット',
                    base: '：',
                    postData:
                    {
                        name: 'お名前',
                        kana: 'フリガナ',
                        mail: 'メールアドレス',
                        mobile: '携帯番号',
                        landline: '電話番号',
                        zip: '住所',
                        address: '住所',
                        area: '■ 希望エリア'
                    }
                },
                {
                    target: 'KH会員登録',
                    base: ':',
                    postData:
                    {
                        name: 'お名前',
                        kana: 'ふりがな',
                        mail: 'メールアドレス',
                        mobile: '携帯電話番号',
                        zip: 'ご住所',
                        address: 'ご住所',
                        medium: '何を見て「国分ハウジング」お知りになりましたか？',
                        area: 'ご希望の土地のエリア'
                    }
                },
                {
                    target: 'JH会員登録',
                    base: ':',
                    postData:
                    {
                        name: 'お名前',
                        kana: 'フリガナ',
                        mail: 'メールアドレス',
                        mobile: '電話番号',
                        zip: 'ご住所',
                        address: 'ご住所',
                        medium: 'ジャスフィーホームを知ったきっかけ',
                        area: 'ご希望の土地のエリアを教えてください'
                    }
                },
                {
                    target: 'なごみ会員登録',
                    base: ':',
                    postData:
                    {
                        name: 'お名前',
                        kana: 'ふりがな',
                        mail: 'メールアドレス',
                        mobile: '携帯電話番号',
                        zip: 'ご住所',
                        address: 'ご住所',
                        medium: '何を見て「なごみ工務店」お知りになりましたか？',
                        area: 'ご希望の土地のエリア'
                    }
                },
                {
                    target: '事前アンケート',
                    base: '：',
                    postData:
                    {
                        name: '名前(漢字)',
                        considerationStart: '新しいお住まいについて、いつ頃からご検討を始められたか教えてください。',
                        desiredMoveIn: 'ご入居希望時期を教えてください。',
                        visitedCompanies: '今まで何社の住宅会社様へご訪問されたか教えてください。',
                        reasonForConsidering: '新しいお住まいをご検討される理由を教えてください。(複数選択可)',
                        reasonOther: '「その他」を選択された方は以下に記載をお願いいたします。',
                        futurePlan: '今後の行動予定について教えてください。',
                        futureOther: '「その他」を選択された方は以下に記載をお願いいたします。',
                        desiredSize: 'お家の広さはどのくらいをご希望か教えてください。',
                        desiredLayout: 'ご希望の間取りを教えてください。',
                        priorityItem: '重視している項目を教えてください。',
                        expectedResidents: 'ご入居予定の人数を教えてください。',
                        totalBudget: 'お家づくりの総予算を教えてください。',
                        monthlyRepayment: 'ご希望の月々の返済額を教えてください。',
                        annualIncome: '前年度のご年収を教えてください。',
                        yearsOfService: '勤続年数を教えてください。',
                        otherIncomePerson: 'その他、ご年収がある方がいらっしゃるか教えてください。(複数選択可)',
                        otherAnnualIncome: 'ご年収がある方のご年収を教えてください。',
                        ownFunds: '自己資金でのお支払いのご予定があるか教えてください。',
                        otherLoans: 'その他ローンがございましたら教えてください。(複数選択可)',
                        thingsToDo: '当日したいことを教えてください。(複数選択可)',
                        thingsToDoOther: '「その他」を選択された方は以下に記載をお願いいたします。',
                        housingType: '新しいお住まいのご希望を教えてください。(複数選択可)',
                        housingTypeOther: '「その他」を選択された方は以下に記載をお願いいたします。',
                        landArea: 'ご希望の土地のエリアを教えてください。',
                        referrerName: 'ご紹介者さまがいる場合はご紹介者さまの氏名をご記入ください。',
                        emailAddress: 'メールアドレス',
                    }
                },
                {
                    target: '2L会員登録',
                    base: ':',
                    postData:
                    {
                        name: '名前(漢字)',
                        kana: '名前(かな)',
                        mail: 'メールアドレス',
                        mobile: '電話番号',
                        zip: '郵便番号',
                        pref: '都道府県',
                        city: '市・区',
                        town: '町村・番地',
                        street: 'ビル名・建物名・番号',
                        medium: '会員登録のきっかけ',
                        area: 'ご希望の土地のエリア'
                    }
                },
                {
                    target: 'カゴスマ資料請求',
                    base: '：',
                    postData:
                    {
                        name: 'お名前',
                        kana: 'ふりがな',
                        mail: 'メールアドレス',
                        mobile: 'お電話番号',
                        address: 'ご住所',
                        area: '居住希望エリア',
                    }
                },
                {
                    target: 'カゴスマ来場予約',
                    base: '：',
                    postData:
                    {
                        name: 'お名前',
                        kana: 'ふりがな',
                        mail: 'メールアドレス',
                        mobile: 'お電話番号',
                        area: '居住希望エリア',
                    }
                },
                {
                    target: 'ハウジングバザール',
                    base: '：',
                    postData:
                    {
                        name: '◆ お名前',
                        kana: '◆ フリガナ',
                        mail: '◆ Emailアドレス',
                        mobile: '◆ TEL',
                        area: '◆ 建築予定地',
                        zip: '◆ 住所',
                        address: '◆ 住所',
                    }
                },
            ];



            for (const item of searchList) {
                const searchCriteria = [['SINCE', targetDate], ['HEADER', 'Subject', item.title], ['FROM', item.mail]];

                const fetchOptions = {
                    bodies: [''],
                    struct: true
                };

                console.log('検索条件:', searchCriteria);

                imapClient.search(searchCriteria, (err, results) => {
                    if (err) {
                        console.error('search エラー:', err);
                        return closeConnection();
                    }

                    console.log('検索結果:', results);

                    if (results.length === 0) {
                        console.log('該当するメールが見つかりませんでした');
                        return closeConnection();
                    }

                    const f = imapClient.fetch(results, fetchOptions);

                    f.on('message', (msg, seqno) => {
                        const prefix = `(#${seqno}) `;

                        let buffer = '';

                        msg.on('body', (stream) => {
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8');
                            });

                            stream.once('end', async () => {
                                try {
                                    const parsed = await simpleParser(buffer);
                                    const targetMedium = searchObject.find(s => s.target === item.target);
                                    const targetBase = targetMedium?.base ?? '';
                                    for (const [key, value] of Object.entries(targetMedium?.postData ?? {})) {
                                        console.log(`${value}:${extractLetter(item.target, parsed.text ?? '', key, value, targetBase)}`);
                                    }
                                } catch (err) {
                                    console.error('simpleParser エラー:', err);
                                }
                            });
                        });
                    });

                    f.once('error', (err) => {
                        console.error('Fetchエラー:', err);
                    });

                    f.once('end', () => {
                        console.log(`${item.target}のメッセージをフェッチしました`);
                        closeConnection();
                    });
                });
            };
        });
    });

    imapClient.connect();
};

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPGMail = void 0;
const axios_1 = __importDefault(require("axios"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendErrorMail_1 = require("./sendErrorMail");
const API_URL = 'https://khg-marketing.info/dashboard/api/gateway/';
const DELAY_MS = 1000;
const errors = [];
const MAIL_SUBJECT = "【PG-HOUSE】お問い合わせいただきありがとうございます";
const createMailBody_reserve = (user) => {
    return `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''} 様

この度は、PGハウスへご来場予約をいただき、誠にありがとうございます。

お会いできることを心より楽しみにしております。

当日は、お客様のご希望に合わせて、

・家づくりの進め方
・土地探しのポイント
・住宅ローンや資金計画
・ご希望に合った間取りのご提案

などを分かりやすくご案内いたします。

また、ご来場までのお時間に、ぜひこちらのYouTube動画をご覧ください。

【家づくりを始める前に知っておきたいポイント】
https://www.youtube.com/watch?v=UWkbPuMdy0E

事前にご覧いただくことで、当日は動画ではお伝えしきれない内容や、お客様に合わせた具体的なご提案・ご相談に時間を使うことができます。

「まだ家を建てるか決めていない」
「情報収集だけしたい」
という方も大歓迎です。

無理な営業をすることは一切ございませんので、どうぞ安心してお越しください。

ご都合が悪くなった場合や、お時間の変更をご希望の場合は、お気軽にご連絡ください。

お会いできますことをスタッフ一同、心よりお待ちしております。

PGハウス`;
};
const createMailBody_catalog = (user) => {
    return `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''} 様

この度は、PGハウスへ資料をご請求いただき、誠にありがとうございます。

ご請求いただいた資料は、順次発送いたしますので、お手元に届くまで今しばらくお待ちください。

資料がお手元に届くまでの間に、ぜひこちらのYouTube動画もご覧ください。

【① PGハウスが選ばれる理由】
https://www.youtube.com/watch?v=22V3RrJ2Jio

【② 家づくりで後悔しないために知っておきたいポイント】
https://www.youtube.com/watch?v=dbYzUX9LpQc

どちらも短時間でご覧いただける内容となっており、

・なぜPGハウスは高性能な住まいを手の届きやすい価格で提供できるのか
・家づくりで失敗しないために押さえておきたいポイント

を分かりやすくご紹介しています。

さらに現在、事前にWEBからご予約のうえご来場いただいたお客様へ、Amazonギフトカード20,000円分をプレゼントしております。

「まずは話だけ聞いてみたい」
「住宅ローンや土地探しについて相談したい」
という方も大歓迎です。

経験豊富なスタッフがお客様一人ひとりに合わせて、資金計画から土地探し、間取りのご提案まで丁寧にサポートいたします。

▼来場予約はこちら
https://kyusyu.pg-house.jp/reservation/

お会いできることを、スタッフ一同心より楽しみにしております。

PGハウス`;
};
const runPGMail = async (id, pass) => {
    console.log('🚀 メルマガ送信バッチ処理を開始します...');
    if (!id || !pass || !process.env.SENDER_EMAIL) {
        const envErr = "認証情報（ID/PASS）または SENDER_EMAIL が設定されていません。";
        console.error(envErr);
        errors.push(envErr);
        await (0, sendErrorMail_1.sendErrorMail)(errors, 'runPGMail.ts');
        return;
    }
    const transporter = nodemailer_1.default.createTransport({
        service: "gmail",
        auth: {
            user: id,
            pass: pass,
        },
    });
    const sendUserMail = async (user) => {
        const mailOptions = {
            from: `"PGハウス" <${process.env.SENDER_EMAIL}>`,
            to: user.mail,
            // to: 'mkt@kh-house.jp',
            subject: MAIL_SUBJECT,
            text: user.medium === 'ホームページ反響' ? createMailBody_reserve(user) : createMailBody_catalog(user),
        };
        await transporter.sendMail(mailOptions);
    };
    try {
        const fetchResponse = await axios_1.default.post(API_URL, { request: 'catalog_mail' });
        const users = fetchResponse.data;
        if (!Array.isArray(users)) {
            throw new Error('APIからのレスポンスが配列ではありませんでした。');
        }
        console.log(`📋 取得したユーザー数: ${users.length}件`);
        for (const user of users) {
            if (user.note === 'mail') {
                console.log(`[Skip] ID: ${user.id} は送信済みのためスキップ`);
                continue;
            }
            try {
                await sendUserMail(user);
                await axios_1.default.post(API_URL, { request: 'catalog_mail', id: user.id });
                console.log(`[Success] ID: ${user.id} (${user.last_name}様) へ送信完了`);
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
            catch (err) {
                const errMsg = `[Error] ID: ${user.id} (${user.mail}) への処理失敗: ${err.message}`;
                console.error(errMsg);
                errors.push(errMsg);
            }
        }
    }
    catch (err) {
        const fatalMsg = `[Fatal Error] 全体処理中に致命的なエラーが発生しました: ${err.message}`;
        console.error(fatalMsg);
        errors.push(fatalMsg);
    }
    finally {
        if (errors.length > 0) {
            console.log(`⚠️ ${errors.length}件のエラーが発生したため、管理者へ通知メールを送信します。`);
            try {
                await (0, sendErrorMail_1.sendErrorMail)(errors, 'runPGMail.ts');
            }
            catch (notifyErr) {
                console.error("エラー通知メールの送信自体に失敗しました:", notifyErr.message);
            }
        }
        else {
            console.log('✅ 全ての処理が正常に完了しました（エラーなし）。');
        }
    }
};
exports.runPGMail = runPGMail;

import nodemailer from 'nodemailer';
import { mailList } from '../utils/valueList';

export const runWeekday = async (postData: any) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL,
            pass: process.env.GMAIL_PASS,
        },
    });

    const isBrand = mailList.map(m => m.brand).some(brandValue => brandValue === postData.brand);
    const ccValue = isBrand ? mailList.find(m => m.brand === postData.brand)?.mail : '';

    const mailOptions = {
        from: '"平日来場キャンペーン" <mkt@kh-house.jp>',
        to: "mkt@kh-house.jp",
        cc: ccValue,
        subject: `${postData.shop}_平日来場キャンペーンからの反響`,
        text: `平日来場キャンペーンからの反響がありました。
    ====================
    お客様情報
    ====================
    エリア:${postData.area}
    ブランド:${postData.brand}
    店舗:${postData.shop}
    来場希望日:${postData.date}
    来場希望時間:${postData.time}
    お名前（漢字）:${postData.name}
    お名前（かな）:${postData.kana}
    携帯番号:${postData.phone}
    メールアドレス:${postData.mail}
    ====================
    ※内容を確認のうえ対応をお願いいたします。
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("反響メールを送信しました");
    } catch (err) {
        console.error("メール送信に失敗しました:", err);
        const errMailOptions = {
            from: 'error@khg-marketing.info',
            to: process.env.GMAIL,
            subject: '【自動送信】平日来場キャンペーンのメール送信でエラー発生',
            text: `以下のエラーが発生しました:${err}`,
        };
        try {
            await transporter.sendMail(errMailOptions);
            console.log('エラーメールを送信しました');
        } catch (err) {
            console.error('エラーメール送信に失敗しました:', err);
        }
    }
};

require("dotenv").config();
const nodemailer = require("nodemailer");

const runWeekday = async (postData) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "shinji.kawano@kh-group.jp",
      pass: "bdrm wqln tlcr gwmq",
    },
  });

  let ccValue;
  if (postData.brand === '国分ハウジング'){
    ccValue = 'kh@kh-group.jp';
  } else if (postData.brand === 'デイジャストハウス'){
    ccValue = 'djh@kh-group.jp';
  } else if (postData.brand === 'なごみ工務店'){
    ccValue = 'nagomi@kh-group.jp';
  } else if (postData.brand === 'ニーエルホーム'){
    ccValue = '2lhome@kh-group.jp';
  } else if (postData.brand === 'ジャスフィーホーム'){
    ccValue = 'jh@kh-group.jp';
  } else if (postData.brand === 'PG HOUSE'){
    ccValue = 'pghouse@kh-house.jp';
  }

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
  }
};

module.exports = runWeekday;

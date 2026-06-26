"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendErrorMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendErrorMail = async (errors, project) => {
    const transporter = nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL,
            pass: process.env.GMAIL_PASS,
        },
    });
    if (errors.length > 0) {
        const mailOptions = {
            from: 'error@khg-marketing.info',
            to: process.env.GMAIL,
            subject: '【自動送信】 Dashboard処理作業中にエラー発生',
            text: `以下のエラーが発生しました:\n${project}\n\n${errors.join('\n')}`,
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log('エラーメールを送信しました');
        }
        catch (err) {
            console.error('メール送信に失敗しました:', err);
        }
        finally {
            errors.length = 0;
        }
    }
};
exports.sendErrorMail = sendErrorMail;

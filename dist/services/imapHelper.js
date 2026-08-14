"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchImapMails = void 0;
const node_imap_1 = __importDefault(require("node-imap"));
const mailparser_1 = require("mailparser");
// 共通のIMAP処理関数
const fetchImapMails = async (id, pass, searchCriteria, processMailCallback) => {
    return new Promise((resolve, reject) => {
        if (!id || !pass)
            return reject(new Error("IDまたはパスワードがありません"));
        const imapClient = new node_imap_1.default({
            user: id, password: pass, host: "imap.gmail.com", port: 993, tls: true, authTimeout: 10000, tlsOptions: { rejectUnauthorized: false }
        });
        let processingCount = 0;
        let fetchEnded = false;
        const checkDone = () => {
            if (fetchEnded && processingCount === 0) {
                imapClient.end();
                resolve();
            }
        };
        imapClient.on("error", (err) => { imapClient.destroy(); reject(err); });
        imapClient.once("ready", () => {
            imapClient.openBox("INBOX", true, (err) => {
                if (err) {
                    imapClient.end();
                    return reject(err);
                }
                imapClient.search(searchCriteria, (err, results) => {
                    if (err) {
                        imapClient.end();
                        return reject(err);
                    }
                    if (results.length === 0) {
                        imapClient.end();
                        return resolve();
                    }
                    const f = imapClient.fetch(results, { bodies: "", struct: true });
                    f.on("message", (msg, seqno) => {
                        msg.on("body", (stream) => {
                            processingCount++;
                            (0, mailparser_1.simpleParser)(stream, async (err, parsed) => {
                                if (!err) {
                                    try {
                                        await processMailCallback(parsed, seqno); // 各ファイルの独自処理を呼び出す
                                    }
                                    catch (e) {
                                        console.error(`メール #${seqno} 処理エラー:`, e);
                                    }
                                }
                                processingCount--;
                                checkDone();
                            });
                        });
                    });
                    f.once("end", () => { fetchEnded = true; checkDone(); });
                });
            });
        });
        imapClient.connect();
    });
};
exports.fetchImapMails = fetchImapMails;

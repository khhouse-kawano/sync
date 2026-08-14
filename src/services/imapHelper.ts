import Imap from "node-imap";
import { simpleParser, ParsedMail } from "mailparser";

// 共通のIMAP処理関数
export const fetchImapMails = async (
    id: string, 
    pass: string, 
    searchCriteria: any[], 
    processMailCallback: (parsed: ParsedMail, seqno: number) => Promise<void>
): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!id || !pass) return reject(new Error("IDまたはパスワードがありません"));

        const imapClient = new Imap({
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
                if (err) { imapClient.end(); return reject(err); }

                imapClient.search(searchCriteria, (err, results) => {
                    if (err) { imapClient.end(); return reject(err); }
                    if (results.length === 0) {
                        imapClient.end();
                        return resolve();
                    }

                    const f = imapClient.fetch(results, { bodies: "", struct: true });
                    f.on("message", (msg, seqno) => {
                        msg.on("body", (stream) => {
                            processingCount++;
                            simpleParser(stream, async (err, parsed) => {
                                if (!err) {
                                    try {
                                        await processMailCallback(parsed, seqno); // 各ファイルの独自処理を呼び出す
                                    } catch (e) {
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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summaryController = void 0;
const summaryService_1 = require("../services/summaryService");
exports.summaryController = {
    handleSummary: async (req, res) => {
        const data = req.body.data;
        if (!data ||
            (Array.isArray(data) && data.length === 0) ||
            Object.keys(data).length === 0) {
            console.warn("Summary API: Empty data received.");
            return res.status(200).json({ summary: "分析対象のデータがまだありません。" });
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Transfer-Encoding", "chunked");
        let keepAliveInterval = setInterval(() => {
            res.write("\n");
        }, 10000);
        try {
            const stream = await summaryService_1.summaryService.generateSummaryStream(data);
            for await (const chunk of stream) {
                if (keepAliveInterval) {
                    clearInterval(keepAliveInterval);
                    keepAliveInterval = null;
                }
                res.write(chunk.text());
            }
            res.end();
        }
        catch (e) {
            console.error("Summary Error:", e);
            if (keepAliveInterval)
                clearInterval(keepAliveInterval);
            if (!res.writableEnded) {
                res.write("<br /><strong>エラーが発生しました: 分析処理に失敗しました。</strong>");
                res.end();
            }
        }
        finally {
            if (keepAliveInterval)
                clearInterval(keepAliveInterval);
        }
    }
};

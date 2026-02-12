"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfToPptService = void 0;
const runPdfToPpt_1 = require("./runPdfToPpt");
exports.pdfToPptService = {
    process: async (postData) => {
        try {
            // runPdfToPpt は Promise<string> (ファイルパス) を返す想定です
            const filePath = await (0, runPdfToPpt_1.runPdfToPpt)(postData);
            return {
                ok: true,
                message: `${new Date().toISOString()}_PDFから変換成功`,
                filePath: filePath // ここでパスを返すように追加
            };
        }
        catch (error) {
            console.error("runPdfToPpt error:", error);
            return {
                ok: false,
                message: "PDFから変換に失敗しました",
                filePath: null // 失敗時はnull
            };
        }
    }
};

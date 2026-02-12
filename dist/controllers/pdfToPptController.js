"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfToPptController = void 0;
const pdfToPptService_1 = require("../services/pdfToPptService");
exports.pdfToPptController = {
    handlePdfToPptController: async (req, res) => {
        const postData = req.body;
        const result = await pdfToPptService_1.pdfToPptService.process(postData);
        if (result.ok && result.filePath) {
            // ファイルをバイナリとして送信します
            // 第2引数は保存時のデフォルトファイル名です
            const downloadName = postData.fileName
                ? postData.fileName.replace('.pdf', '.pptx')
                : 'converted.pptx';
            return res.download(result.filePath, downloadName);
        }
        return res.status(500).send({ message: "変換に失敗しました" });
    }
};

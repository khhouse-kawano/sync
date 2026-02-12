import { Request, Response } from "express";
import { pdfToPptService } from "../services/pdfToPptService";

export const pdfToPptController = {
    handlePdfToPptController: async (req: Request, res: Response) => {
        const postData = req.body;
        const result = await pdfToPptService.process(postData);

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
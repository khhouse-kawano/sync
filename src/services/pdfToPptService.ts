import { runPdfToPpt } from './runPdfToPpt';

export const pdfToPptService = {
    process: async (postData: any) => {
        try {
            // runPdfToPpt は Promise<string> (ファイルパス) を返す想定です
            const filePath = await runPdfToPpt(postData);
            
            return {
                ok: true,
                message: `${new Date().toISOString()}_PDFから変換成功`,
                filePath: filePath // ここでパスを返すように追加
            };
        } catch (error) {
            console.error("runPdfToPpt error:", error);
            return {
                ok: false,
                message: "PDFから変換に失敗しました",
                filePath: null // 失敗時はnull
            };
        }
    }
};
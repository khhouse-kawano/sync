import { Request, Response } from "express";
import { areaSummaryService } from "../services/areaSummaryService";

export const areaSummaryController = {
  handleAreaSummary: async (req: Request, res: Response) => {
    const data = req.body.data;

    if (
      !data ||
      (Array.isArray(data) && data.length === 0) ||
      Object.keys(data).length === 0
    ) {
      console.warn("Summary API: Empty data received.");
      return res.status(200).json({ summary: "分析対象のデータがまだありません。" });
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    let keepAliveInterval: NodeJS.Timeout | null = setInterval(() => {
      res.write("\n");
    }, 10000);

    try {
      const stream = await areaSummaryService.generateSummaryStream(data);

      for await (const chunk of stream) {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }
        res.write(chunk.text());
      }

      res.end();
    } catch (e) {
      console.error("Summary Error:", e);

      if (keepAliveInterval) clearInterval(keepAliveInterval);

      if (!res.writableEnded) {
        res.write("<br /><strong>エラーが発生しました: 分析処理に失敗しました。</strong>");
        res.end();
      }
    } finally {
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    }
  }
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areaSummaryService = void 0;
const genAI_1 = require("../config/genAI");
exports.areaSummaryService = {
    generateSummaryStream: async (data) => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const dataString = JSON.stringify(data);
        const prompt = `
      あなたは国分ハウジンググループのミドルウェア「Dashboard」です。
      以下のデータを分析し、HTML形式で要約を出力してください。

      【前提条件】
      1. 役割：マーケティング分析AI。
      2. ${year}年${month}月は分析除外。

      【用語】
      - register:反響数, reserve:来場数, contract:契約数

      【出力構成（全5部・約700文字）】
      以下の5つの見出しで構成し、回答はプレーンテキストとHTMLタグ（<strong>, <br />）のみで返してください。
      JSON形式やMarkdownのコードブロック（\`\`\`）は絶対に使用しないでください。
      各タイトルの前には必ず <br /><br /> を入れてください。

      1. 注文住宅市場:
         - 販促媒体と絡めて自社の注文住宅の反響～契約数分析。エリアの着工棟数分析。
      2. 建売住宅市場:
         - 販促媒体と絡めて自社の建売住宅の反響～契約数分析。エリアの着工棟数分析。
      3. 市場・人口動態・居住形態の特徴:
         - 世代ごとの人口分布や居住形態、エリアの着工棟数を踏まえた市場分析。
      4. 戦略・戦術:
         - 適切な販促媒体や施策、またDashboardを活用した今後の具体的なアクションプラン。
      5. エリア総括:
         - 自社の立ち位置を俯瞰して回答。今後のポジティブ/ネガティブな展望も分析。

      【データ】
      <JSON_DATA>
      ${dataString}
      </JSON_DATA>
    `;
        const model = genAI_1.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContentStream(prompt);
        return result.stream;
    }
};

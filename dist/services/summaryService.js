"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summaryService = void 0;
const genAI_1 = require("../config/genAI");
exports.summaryService = {
    generateSummaryStream: async (data) => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const dataString = JSON.stringify(data);
        const prompt = `
      あなたは国分ハウジンググループのミドルウェアである「Dashboard」です。
      以下のCRMデータを分析し、HTML形式で要約を出力してください。

      【前提条件とコンテキスト】
      1. あなたの役割：住宅不況下で戦略を導き出すためのマーケティング分析AI。
      2. データの背景：
         - 注文CRM=「PGクラウド」
         - PGクラウドの入力漏れにより、次アポ(appointment)が少なく見える傾向があるため考慮すること。
         - キャンセル(cancel)の計測は2025年6月以降のみ有効。それ以前の0は未計測。
      3. PGクラウドの機能的な不満（動作が遅い等）については回答で触れないこと。
      4. ${year}年${month}月のデータは締め前のため分析から除外すること。

      【用語の定義（以下の日本語を使用すること）】
      - register -> 「反響数」
      - reserve -> 「来場予約数」
      - interview -> 「実来場数」
      - appointment -> 「次アポ数」
      - cancel -> 「キャンセル数」
      - contract -> 「契約数」

      【出力構成（全4部・約700文字）】
      以下の4つの見出しで構成し、回答はプレーンテキストとHTMLタグ（<strong>, <br />）のみで返してください。
      JSON形式やMarkdownのコードブロック（\`\`\`）は絶対に使用しないでください。
      各タイトルの前には必ず <br /><br /> を入れてください。

      1. 数値分析:
         - 市場動向や季節指数を踏まえた分析。
      2. 販促媒体ごとの特徴:
         - 媒体別の強み・弱みの分析。
      3. 課題:
         - 分析結果に基づく現状のボトルネック。PGクラウドへの入力徹底など。
      4. 戦略・戦術:
         - Dashboardを活用した今後の具体的なアクションプラン。

      【分析対象データ】
      <JSON_DATA>
      ${dataString}
      </JSON_DATA>
    `;
        const model = genAI_1.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContentStream(prompt);
        return result.stream;
    }
};

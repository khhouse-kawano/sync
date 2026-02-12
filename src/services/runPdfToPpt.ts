import { pdfToPng } from 'pdf-to-png-converter';
import pptxgen from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { Buffer } from 'buffer';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';

// 動いているモデル名
const GEMINI_MODEL_NAME = 'gemini-2.5-flash'; 

export const runPdfToPpt = async (postData: any): Promise<string> => {
    try {
        const { pdfBase64, fileName } = postData;
        if (!pdfBase64) throw new Error("PDFデータが空です");

        // --- PDF処理 ---
        const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        const pdfArrayBuffer = pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength);

        // 画像化 (OCR精度確保のためスケール2.0)
        const pngPages = await pdfToPng(pdfArrayBuffer, { viewportScale: 2.0 });
        const safeFileName = fileName ? fileName.replace('.pdf', '') : `converted_${Date.now()}`;

        const pptx = new pptxgen();

        // ページ処理
        for (const [index, page] of pngPages.entries()) {
            if (!page || !page.content) continue;

            console.log(`Slide ${index + 1}: Gemini (${GEMINI_MODEL_NAME}) で解析中...`);

            // 1. スライド作成 & 背景設定
            const slide = pptx.addSlide();
            const imageBase64 = `data:image/png;base64,${page.content.toString('base64')}`;
            slide.background = { data: imageBase64 };

            // 2. Gemini APIを直接叩く
            const layoutData = await analyzeImageWithGeminiDirect(page.content);

            // 3. テキストボックス配置（背景色カモフラージュ）
            if (layoutData && layoutData.length > 0) {
                layoutData.forEach((item: any) => {
                    // 範囲計算
                    const padding = 1.0; // 少し広めに隠す
                    let x = (typeof item.x === 'number' ? item.x : 0) - padding;
                    let y = (typeof item.y === 'number' ? item.y : 0) - padding;
                    let w = (typeof item.w === 'number' ? item.w : 10) + (padding * 2);
                    let h = (typeof item.h === 'number' ? item.h : 5) + (padding * 2);

                    // 範囲制限
                    x = Math.max(0, x);
                    y = Math.max(0, y);
                    w = Math.min(100 - x, w);
                    h = Math.min(100 - y, h);
                    
                    // フォントサイズ
                    let fontSize = typeof item.fontSize === 'number' ? item.fontSize : 12;
                    if (fontSize < 8) fontSize = 8;
                    if (fontSize > 100) fontSize = 40;

                    // ★重要: Geminiが検出した色を使う (なければ白)
                    // PowerPointにはHEXコードの先頭に'#'は不要なので削除
                    let bgColor = (item.bgColor || "FFFFFF").replace('#', '');
                    let fontColor = (item.fontColor || "000000").replace('#', '');

                    slide.addText(item.text || "", {
                        x: `${x}%`,
                        y: `${y}%`,
                        w: `${w}%`,
                        h: `${h}%`,
                        fontSize: fontSize,
                        color: fontColor, // 文字色も合わせる
                        fill: { color: bgColor }, // ★背景色を合わせる！
                        align: 'left',
                        valign: 'top',
                        margin: 2
                    });
                });
                console.log(`   ✅ ${layoutData.length}箇所のテキストを背景色に合わせて復元しました`);
            } else {
                console.log(`   ⚠️ テキスト検出なし`);
            }

            // フロントエンド送信
            const imageFileName = `page_${(index + 1).toString().padStart(3, '0')}.png`;
            const formData = new FormData();
            formData.append('image', page.content, { filename: imageFileName, contentType: 'image/png' });
            formData.append('pdfId', safeFileName); 
            formData.append('pageNumber', index + 1);
            try {
                await axios.post("https://khg-marketing.info/api/receive-png/", formData, { headers: { ...formData.getHeaders() } });
            } catch (e) { /* ignore */ }
        }

        // --- 保存 ---
        const outputDir = path.join(process.cwd(), 'exports');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const outputFilePath = path.join(outputDir, `${safeFileName}_${Date.now()}.pptx`);
        
        await pptx.writeFile({ fileName: outputFilePath });
        console.log(`✅ すべて完了: ${outputFilePath}`);

        return outputFilePath;

    } catch (error: any) {
        console.error("Fatal Error:", error);
        throw error;
    }
};

// --- ヘルパー関数 ---
async function analyzeImageWithGeminiDirect(imageBuffer: Buffer): Promise<any[]> {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
        
        // ★プロンプト変更：背景色と文字色を推定させる
        const promptText = `
            Analyze this image for OCR and Design Reconstruction.
            Identify all text blocks. For each block, estimate the solid background color behind the text.

            Return a JSON ARRAY only. Each object must have:
            - "text": string (The exact content)
            - "x": number (percentage from left 0-100)
            - "y": number (percentage from top 0-100)
            - "w": number (width percentage)
            - "h": number (height percentage)
            - "fontSize": number (estimated size e.g. 12)
            - "bgColor": string (The estimated Hex color code of the background behind this text, e.g. "#F0F0F0")
            - "fontColor": string (The estimated Hex color code of the text itself, e.g. "#000000")
            
            Valid JSON only. No markdown.
        `;

        const payload = {
            contents: [{
                parts: [
                    { text: promptText },
                    {
                        inline_data: {
                            mime_type: "image/png",
                            data: imageBuffer.toString('base64')
                        }
                    }
                ]
            }]
        };

        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const candidate = response.data.candidates?.[0];
        if (!candidate || !candidate.content || !candidate.content.parts) return [];

        let text = candidate.content.parts[0].text || "";
        text = text.replace(/```json/g, '').replace(/```/g, '');
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1) {
            text = text.substring(firstBracket, lastBracket + 1);
            return JSON.parse(text);
        } else {
            return [];
        }

    } catch (error: any) {
        console.error(`Gemini API Error: ${error.message}`);
        return [];
    }
}
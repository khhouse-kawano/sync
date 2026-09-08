"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postGateway = void 0;
const axios_1 = __importDefault(require("axios"));
const POST_URL = "https://khg-marketing.info/dashboard/api/gateway/";
const CHUNK_SIZE = 500;
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1000;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const postChunk = async (request, chunk) => {
    let lastErr = null;
    for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
        try {
            const res = await axios_1.default.post(POST_URL, { request, data: chunk }, { headers: { "Content-Type": "application/json" }, timeout: 60000 });
            return res.data ?? {};
        }
        catch (err) {
            lastErr = err;
            if (attempt < RETRY_COUNT)
                await delay(RETRY_DELAY_MS);
        }
    }
    throw lastErr;
};
/**
 * dashboard の gateway へレコードを 500 件ずつ分割して送信する。
 * チャンク単位で失敗しても後続は継続し、結果をまとめて返す。
 */
const postGateway = async (request, rows) => {
    const result = { total: rows.length, inserted: 0, errors: [] };
    if (rows.length === 0) {
        console.log(`[${request}] 送信対象のレコードがありません`);
        return result;
    }
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
        try {
            console.log(`[${request}] chunk ${chunkNumber} (${chunk.length}件) を送信します...`);
            const res = await postChunk(request, chunk);
            result.inserted += res?.inserted ?? 0;
            if (Array.isArray(res?.errors) && res.errors.length > 0) {
                result.errors.push(`chunk ${chunkNumber}: ${res.errors.join(" / ")}`);
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`[${request}] chunk ${chunkNumber} の送信に失敗: ${message}`);
            result.errors.push(`chunk ${chunkNumber} の送信に失敗: ${message}`);
        }
    }
    console.log(`[${request}] 送信完了 total=${result.total} inserted=${result.inserted} errors=${result.errors.length}`);
    return result;
};
exports.postGateway = postGateway;

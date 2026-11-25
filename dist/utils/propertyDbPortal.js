"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPropertyDbPortal = exports.buildPortalPayloads = void 0;
const axios_1 = __importDefault(require("axios"));
const URL = process.env.SYNC_LOG_URL || 'https://api.khg-marketing.info/api/gateway';
/** ② が1回に受ける行の上限と同じ */
const CHUNK_SIZE = 500;
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errorText = (err) => {
    if (axios_1.default.isAxiosError(err))
        return `${err.response?.status ?? ''} ${JSON.stringify(err.response?.data ?? err.message)}`.trim();
    return err instanceof Error ? err.message : String(err);
};
/** 送る塊（② の property_db_portal の本文）。⚠️ テストのため外に出している */
const buildPortalPayloads = (portal, account, rows, key) => {
    const payloads = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        payloads.push({ request: 'property_db_portal', key, portal, account, rows: rows.slice(i, i + CHUNK_SIZE) });
    }
    return payloads;
};
exports.buildPortalPayloads = buildPortalPayloads;
/**
 * @param portal  どのポータルの行か
 * @param account アカウント（SUUMO・at home は kaeru / resale、HOME'S は spec / used。portalService が各処理に渡す brand のまま）
 * @param rows    ① の summary へ送った行
 * @param errors  失敗の理由を足す配列
 */
const sendPropertyDbPortal = async (portal, account, rows, errors) => {
    const totals = {};
    if (rows.length === 0)
        return totals;
    if (!account) {
        errors.push(`物件DB を補えませんでした（${portal}）: アカウント（brand）がありません`);
        return totals;
    }
    const key = process.env.SYNC_LOG_SECRET ?? '';
    if (key === '') {
        errors.push(`物件DB を補えませんでした（${portal}）: SYNC_LOG_SECRET が未設定です`);
        return totals;
    }
    for (const [index, payload] of (0, exports.buildPortalPayloads)(portal, account, rows, key).entries()) {
        let lastError = '';
        let done = false;
        for (let attempt = 0; attempt <= RETRY_COUNT && !done; attempt++) {
            try {
                const res = await axios_1.default.post(URL, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 120000 });
                if (res.data?.status !== 'success')
                    throw new Error(JSON.stringify(res.data));
                for (const [name, value] of Object.entries(res.data)) {
                    if (typeof value === 'number')
                        totals[name] = (totals[name] ?? 0) + value;
                }
                done = true;
            }
            catch (err) {
                lastError = errorText(err);
                // ⚠️ 合い言葉の違い（401）・形の違い（400）は、送り直しても同じなのでやめる
                if (axios_1.default.isAxiosError(err) && err.response && err.response.status < 500)
                    break;
                if (attempt < RETRY_COUNT)
                    await sleep(RETRY_DELAY_MS);
            }
        }
        if (!done)
            errors.push(`物件DB を補えませんでした（${portal}・${index * CHUNK_SIZE + 1}〜${index * CHUNK_SIZE + payload.rows.length}件目）: ${lastError}`);
    }
    console.log(`[物件DB ${portal}/${account}] ${JSON.stringify(totals)}`);
    return totals;
};
exports.sendPropertyDbPortal = sendPropertyDbPortal;

import axios from 'axios';

/**
 * ポータルの summary の行で、Dashboard の物件DB（property_db）を補う（Dashboard v2.2.301・request property_db_portal）。
 *
 * ─────────────────────────────────────────────
 * ⚠️ 送り先は ② の api.khg-marketing.info（① は通さない）。合い言葉は SYNC_LOG_SECRET（sync の実行結果と同じ）。未設定なら送らずに失敗として残す。
 * ⚠️ 送る行は ① の summary（suumo_db_resale_summary・athome_db_summary・homes_summary_db）へ送る行と同じもの。
 *   ② が、いえらぶの6桁の物件番号で物件DB と結び、物件DB にある物件は空の列だけ埋め、無い物件はアカウントの店舗で作る。
 *   （書き換えの決まりは Dashboard の backend-express/src/features/propertyPortal.ts）
 * ⚠️ 失敗の理由は errors に足す（呼び出し元が sendErrorMail で知らせる）。例外は投げない。
 *   ⚠️ ① への送信（今までの summary）の成否は変えない。物件DB を補えなくても、summary の表は今までどおり更新される。
 * ─────────────────────────────────────────────
 */

export type PortalName = 'suumo' | 'homes' | 'athome';

const URL = process.env.SYNC_LOG_URL || 'https://api.khg-marketing.info/api/gateway';
/** ② が1回に受ける行の上限と同じ */
const CHUNK_SIZE = 500;
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const errorText = (err: unknown): string => {
    if (axios.isAxiosError(err)) return `${err.response?.status ?? ''} ${JSON.stringify(err.response?.data ?? err.message)}`.trim();
    return err instanceof Error ? err.message : String(err);
};

/** 送る塊（② の property_db_portal の本文）。⚠️ テストのため外に出している */
export const buildPortalPayloads = (portal: PortalName, account: string, rows: Record<string, unknown>[], key: string) => {
    const payloads: { request: string; key: string; portal: PortalName; account: string; rows: Record<string, unknown>[] }[] = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        payloads.push({ request: 'property_db_portal', key, portal, account, rows: rows.slice(i, i + CHUNK_SIZE) });
    }
    return payloads;
};

/**
 * @param portal  どのポータルの行か
 * @param account アカウント（SUUMO・at home は kaeru / resale、HOME'S は spec / used。portalService が各処理に渡す brand のまま）
 * @param rows    ① の summary へ送った行
 * @param errors  失敗の理由を足す配列
 */
export const sendPropertyDbPortal = async (
    portal: PortalName,
    account: string | undefined,
    rows: Record<string, unknown>[],
    errors: string[],
): Promise<Record<string, number>> => {
    const totals: Record<string, number> = {};
    if (rows.length === 0) return totals;
    if (!account) {
        errors.push(`物件DB を補えませんでした（${portal}）: アカウント（brand）がありません`);
        return totals;
    }
    const key = process.env.SYNC_LOG_SECRET ?? '';
    if (key === '') {
        errors.push(`物件DB を補えませんでした（${portal}）: SYNC_LOG_SECRET が未設定です`);
        return totals;
    }
    for (const [index, payload] of buildPortalPayloads(portal, account, rows, key).entries()) {
        let lastError = '';
        let done = false;
        for (let attempt = 0; attempt <= RETRY_COUNT && !done; attempt++) {
            try {
                const res = await axios.post(URL, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 120000 });
                if (res.data?.status !== 'success') throw new Error(JSON.stringify(res.data));
                for (const [name, value] of Object.entries(res.data as Record<string, unknown>)) {
                    if (typeof value === 'number') totals[name] = (totals[name] ?? 0) + value;
                }
                done = true;
            } catch (err) {
                lastError = errorText(err);
                // ⚠️ 合い言葉の違い（401）・形の違い（400）は、送り直しても同じなのでやめる
                if (axios.isAxiosError(err) && err.response && err.response.status < 500) break;
                if (attempt < RETRY_COUNT) await sleep(RETRY_DELAY_MS);
            }
        }
        if (!done) errors.push(`物件DB を補えませんでした（${portal}・${index * CHUNK_SIZE + 1}〜${index * CHUNK_SIZE + payload.rows.length}件目）: ${lastError}`);
    }
    console.log(`[物件DB ${portal}/${account}] ${JSON.stringify(totals)}`);
    return totals;
};

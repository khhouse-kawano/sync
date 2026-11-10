import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import type { NextFunction, Request, Response } from 'express';

/**
 * sync の実行結果を Dashboard の DB（sync_run_log）に残す（2026-11-10。Dashboard v2.2.259）。
 *
 * ─────────────────────────────────────────────
 *   ⚠️ 以前は失敗だけをメールで送っていた（sendErrorMail）。
 *     ・Gmail の認証が切れて（535）届かなくなり、だれも失敗に気づけなかった
 *     ・成功はどこにも残らなかった
 *     ・店舗ごとの失敗のように例外を投げないものは「成功」に隠れていた（2026-11-10 の ielove の 403）
 *   いまは次の形で、成功も失敗も1行ずつ Dashboard の ② へ送る。画面はシステム管理 →「同期の実行結果」。
 *
 *   portal（/api/portal・/api/portal_kaeru）… portalService がタスクごとに runTask で1行
 *   ほかのジョブの入口（JOB_ROUTES）          … syncLogMiddleware が応答のときに1行（応答のあとの失敗は別の行）
 *
 *   状態 success＝失敗なし / partial＝最後まで動いたが途中で失敗あり（sendErrorMail に理由が来た）/ failure＝例外で止まった
 *
 * ⚠️ 送り先は ② へ直接（① を通さない）。合い言葉は Heroku の Config Vars SYNC_LOG_SECRET（② の .env.prod と同じ値）。
 *   未設定なら送らずにコンソールへ出すだけ。⚠️ 送れなくても、取り込みの処理は止めない。
 * ─────────────────────────────────────────────
 */

type SyncStatus = 'success' | 'partial' | 'failure';

type Scope = {
    runId: string;
    route: string;
    task: string;
    errors: string[];
    startedAt: Date;
    /** 行を送ったあと（このあとに来た失敗は、別の行で送る） */
    closed: boolean;
};

type SyncLogRow = {
    runId: string;
    route: string;
    task: string;
    status: SyncStatus;
    message: string;
    errors: string[];
    startedAt: string;
    finishedAt: string;
};

const als = new AsyncLocalStorage<Scope>();

const SYNC_LOG_URL = process.env.SYNC_LOG_URL || 'https://api.khg-marketing.info/api/gateway';

/** ② へ送る。⚠️ 失敗してもコンソールに出すだけ（取り込みの処理は止めない） */
const post = async (rows: SyncLogRow[]): Promise<void> => {
    for (const r of rows) {
        console.log(`[実行結果] ${r.task}: ${r.status}（${r.message}）${r.errors.length ? ` 理由 ${r.errors.length}件` : ''}`);
    }
    const key = process.env.SYNC_LOG_SECRET ?? '';
    if (key === '') {
        console.warn('[実行結果] SYNC_LOG_SECRET が未設定のため、Dashboard へ送りませんでした');
        return;
    }
    try {
        const res = await axios.post(SYNC_LOG_URL, { request: 'sync_log', roll: 'write', key, rows }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000,
        });
        if (res.data?.status !== 'success') console.error('[実行結果] Dashboard への送信に失敗しました:', res.data);
    } catch (err) {
        const detail = axios.isAxiosError(err) ? `${err.response?.status ?? ''} ${JSON.stringify(err.response?.data ?? err.message)}` : String(err);
        console.error(`[実行結果] Dashboard への送信に失敗しました: ${detail}`);
    }
};

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const rowOf = (scope: Scope, status: SyncStatus, message: string, extra: string[] = []): SyncLogRow => ({
    runId: scope.runId,
    route: scope.route,
    task: scope.task,
    status,
    message: message.slice(0, 500),
    errors: [...scope.errors, ...extra],
    startedAt: scope.startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
});

const newScope = (route: string, task: string, runId?: string): Scope => ({
    runId: runId ?? randomUUID(),
    route,
    task,
    errors: [],
    startedAt: new Date(),
    closed: false,
});

/**
 * 失敗の理由を、今のタスク（入口）に足す。⚠️ sendErrorMail から呼ばれる。
 * ⚠️ タスクの外・行を送ったあとに来た理由は、その場で1行（partial）にして送る（黙って捨てない）
 */
export const recordErrors = (errors: string[], project: string): void => {
    const list = errors.map(e => String(e)).filter(e => e !== '').map(e => `[${project}] ${e}`);
    if (list.length === 0) return;
    const scope = als.getStore();
    if (scope && !scope.closed) {
        scope.errors.push(...list);
        return;
    }
    const lone = newScope(scope?.route ?? '(入口の外)', scope?.task ?? project, scope?.runId);
    void post([{ ...rowOf(lone, 'partial', '処理の終わったあとに失敗が記録されました'), errors: list }]);
};

/** 結果だけを1行で残す（認証情報が無い・実行関数が無い など、実行せずに終わったとき） */
export const recordTaskResult = (task: string, status: SyncStatus, message: string): void => {
    const parent = als.getStore();
    void post([rowOf(newScope(parent?.route ?? '(直接)', task, parent?.runId), status, message)]);
};

/**
 * 1つのタスクを実行し、終わったら1行を送る。⚠️ 例外はそのまま投げ直す（呼び出し側の動きは変えない）
 *   例外 → failure、例外なしで理由あり → partial、どちらも無し → success
 * @returns 例外なしで終わったときの状態（success か partial）。理由の件数も
 */
export const runTask = async (task: string, fn: () => Promise<unknown>): Promise<{ status: 'success' | 'partial'; errorCount: number }> => {
    const parent = als.getStore();
    const scope = newScope(parent?.route ?? '(直接)', task, parent?.runId);
    try {
        await als.run(scope, fn);
        scope.closed = true;
        const errorCount = scope.errors.length;
        await post([errorCount
            ? rowOf(scope, 'partial', `${task} は最後まで動きましたが、途中で ${errorCount}件の失敗がありました`)
            : rowOf(scope, 'success', `${task} が完了しました`)]);
        return { status: errorCount ? 'partial' : 'success', errorCount };
    } catch (err) {
        scope.closed = true;
        await post([rowOf(scope, 'failure', `${task} が止まりました: ${errorText(err)}`, [`[例外] ${errorText(err)}`])]);
        throw err;
    }
};

/**
 * 記録する入口（ジョブ）。⚠️ AI のまとめ（summary・areasummary）・PDF→PPT・/open は、
 *   画面から呼ぶ対話の口なので記録しない（行が増えるだけで、取り込みの成否ではない）。
 * ⚠️ portal は portalService がタスクごとに書くので、入口の行は書かない（SELF_REPORT_ROUTES）。
 */
const JOB_ROUTES = [
    '/api/portal', '/api/portal_kaeru', '/api/update', '/api/robo', '/api/before_survey', '/api/add_event',
    '/api/breakaway', '/api/weekday', '/api/mail_scraping', '/api/estate_info',
];
const SELF_REPORT_ROUTES = ['/api/portal', '/api/portal_kaeru'];

/**
 * 記録する入口の名前。当てはまらなければ ''。
 * ⚠️ app.use('/api/', indexRoutes) は /api/update なども通るので、長い入口から順に見る。/api と /api/ は /api（indexRoutes の同期）
 */
const routeOf = (path: string): string => {
    const p = path.replace(/\/+$/, '') || '/';
    if (p === '/api') return '/api';
    return [...JOB_ROUTES].sort((a, b) => b.length - a.length).find(r => p === r || p.startsWith(`${r}/`)) ?? '';
};

/**
 * アプリ全体に1つだけ置くミドルウェア（app.ts で、ルーターより前）。
 * ⚠️ POST だけを記録する（OPTIONS・GET は記録しない）
 */
export const syncLogMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const route = routeOf(req.path);
    if (req.method !== 'POST' || route === '') {
        next();
        return;
    }
    const scope = newScope(route, route);
    if (!SELF_REPORT_ROUTES.includes(route)) {
        res.on('finish', () => {
            scope.closed = true;
            const code = res.statusCode;
            const status: SyncStatus = code >= 400 ? 'failure' : scope.errors.length ? 'partial' : 'success';
            const message = code >= 400
                ? `HTTP ${code} で応答しました`
                : scope.errors.length ? `応答しました（途中で ${scope.errors.length}件の失敗）` : `応答しました（HTTP ${code}）`;
            void post([rowOf(scope, status, message)]);
        });
    }
    als.run(scope, next);
};

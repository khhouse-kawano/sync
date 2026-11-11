"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importSuumoKaeruCustomers = exports.importSuumoKaeruActions = exports.mapCustomer = exports.mapAction = exports.filterRecentCustomers = exports.filterRecentActions = exports.comparableDate = exports.recentCutoff = exports.recentDays = exports.readSuumoCsv = exports.CUSTOMER_HEADER_MAP = exports.ACTION_HEADER_MAP = void 0;
const promises_1 = require("fs/promises");
const sync_1 = require("csv-parse/sync");
const axios_1 = __importDefault(require("axios"));
const DEFAULT_DAYS = 3;
const JST_MS = 9 * 3600000;
const DAY_MS = 86400000;
const CHUNK_SIZE = 500;
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1000;
/** 反響の送り先（② へ直接。sync の実行結果と同じ） */
const ACTIONS_URL = process.env.SYNC_LOG_URL || 'https://api.khg-marketing.info/api/gateway';
/** 顧客の送り先（① のゲートウェイ。⚠️ 検証のときだけ GATEWAY_URL でローカルへ向ける。runGeocode.ts と同じ） */
const CUSTOMERS_URL = process.env.GATEWAY_URL ?? 'https://khg-marketing.info/dashboard/api/gateway/';
/** 反響ごとの CSV の見出し → ② へ送る名前（Dashboard の suumo_action_kaeru の列。予約ID・反響ID は ② が1つの ID にまとめる） */
exports.ACTION_HEADER_MAP = {
    '予約ID': 'reserve_id',
    '反響ID': 'inquiry_id',
    '受付日時': 'received_at',
    '反響種別': 'reaction_type',
    '氏名': 'name',
    '氏名カナ': 'name_kana',
    '住所': 'address',
    'メールアドレス': 'email',
    '電話': 'phone',
    'FAX': 'fax',
    'お客様担当': 'staff',
    '予約ステータス': 'reserve_status',
    '案内日時': 'guide_at',
    'その他のご希望日時': 'other_wish',
    '集合場所': 'meeting_place',
    '連絡事項': 'message',
    'キャンセル日時': 'canceled_at',
    'キャンセル経路': 'cancel_route',
    'キャンセル理由': 'cancel_reason',
    '物件種別': 'property_type',
    '物件コード': 'property_code',
    'プロジェクトコード': 'project_code',
    '物件名': 'property_name',
    '物件価格': 'property_price',
    '物件所在地': 'property_address',
    '掲載企画': 'listing_plan',
    '貴社物件コード': 'company_property_code',
    '取引態様': 'transaction_type',
    '元付会社': 'origin_company',
    '貴社ご担当': 'company_staff',
    '交通': 'traffic',
    '間取り': 'layout',
    '専有面積': 'exclusive_area',
    '建物面積': 'building_area',
    '土地面積': 'land_area',
};
/** 顧客ごとの CSV の見出し → ① へ送る名前（Dashboard の suumo_db_kaeru の列。⚠️ 以前は runSuumoKaeru.ts の中にあった） */
exports.CUSTOMER_HEADER_MAP = {
    '顧客ID': 'customer_id',
    '登録日時': 'registered_at',
    '氏名': 'name',
    '氏名カナ': 'name_kana',
    'メールアドレス': 'email',
    '電話': 'phone',
    'FAX': 'fax',
    '住所': 'address',
    'お客様担当': 'staff',
    '追客状況': 'follow_status',
    '初回反響日': 'first_reaction_date',
    '初回反響方法': 'first_reaction_method',
    '初回反響媒体': 'first_reaction_media',
    'メモ': 'memo',
    '初回反響_予約ID': 'first_reaction_reserve_id',
    '初回反響_反響ID': 'first_reaction_id',
    '初回反響_受付日時': 'first_reaction_received_at',
    '初回反響_反響種別': 'first_reaction_type',
    '初回反響_物件種別': 'first_reaction_property_type',
    '初回反響_物件コード': 'first_reaction_property_code',
    '初回反響_物件名': 'first_reaction_property_name',
    '初回反響_物件価格': 'first_reaction_property_price',
    '初回反響_物件所在地': 'first_reaction_property_address',
    '最新反響_予約ID': 'latest_reaction_reserve_id',
    '最新反響_反響ID': 'latest_reaction_id',
    '最新反響_受付日時': 'latest_reaction_received_at',
    '最新反響_反響種別': 'latest_reaction_type',
    '最新反響_物件種別': 'latest_reaction_property_type',
    '最新反響_物件コード': 'latest_reaction_property_code',
    '最新反響_物件名': 'latest_reaction_property_name',
    '最新反響_物件価格': 'latest_reaction_property_price',
    '最新反響_物件所在地': 'latest_reaction_property_address',
    '初回来場_来場日時': 'first_visit_datetime',
    '初回来場_入力方法': 'first_visit_input_method',
    '初回来場_予定種別': 'first_visit_schedule_type',
    '初回来場_物件種別': 'first_visit_property_type',
    '初回来場_物件コード': 'first_visit_property_code',
    '初回来場_物件名': 'first_visit_property_name',
    '初回来場_物件価格': 'first_visit_property_price',
    '初回来場_物件所在地': 'first_visit_property_address',
    '最新来場_来場日時': 'latest_visit_datetime',
    '最新来場_入力方法': 'latest_visit_input_method',
    '最新来場_予定種別': 'latest_visit_schedule_type',
    '最新来場_物件種別': 'latest_visit_property_type',
    '最新来場_物件コード': 'latest_visit_property_code',
    '最新来場_物件名': 'latest_visit_property_name',
    '最新来場_物件価格': 'latest_visit_property_price',
    '最新来場_物件所在地': 'latest_visit_property_address',
    '成約_成約日': 'contract_date',
    '成約_成約価格': 'contract_price',
    '成約_仲介手数料ステータス': 'contract_fee_status',
    '成約_仲介手数料（万円）': 'contract_fee_amount',
    '成約_付帯工事額・紹介料収入ステータス': 'contract_additional_status',
    '成約_付帯工事額・紹介料収入（万円）': 'contract_additional_amount',
    '成約_物件種別': 'contract_property_type',
    '成約_物件コード': 'contract_property_code',
    '成約_物件名': 'contract_property_name',
    '成約_物件価格': 'contract_property_price',
    '成約_物件所在地': 'contract_property_address',
    '成約_ステータス': 'contract_status',
    '反響回数': 'reaction_count',
    '来場回数': 'visit_count',
    '成約フラグ': 'contract_flag'
};
/** 顧客の項目のうち、数として送るもの */
const CUSTOMER_NUMERIC = new Set(['reaction_count', 'visit_count', 'contract_flag']);
/** 絞り込みに使う日時の見出し（どれか1つでも範囲内なら送る） */
const ACTION_DATE_COLUMNS = ['受付日時', 'キャンセル日時'];
const CUSTOMER_DATE_COLUMNS = ['登録日時', '最新反響_受付日時', '追客状況の最終更新日時'];
/** CSV を読む（見出しの行をキーにした行の配列）。⚠️ 見出し・値の前後の空白は落とす */
const readSuumoCsv = async (path) => {
    const text = (await (0, promises_1.readFile)(path)).toString('utf8');
    const rows = (0, sync_1.parse)(text, { bom: true, columns: true, skip_empty_lines: true, relax_column_count: true, trim: true });
    return rows.map((row) => {
        const out = {};
        for (const [key, value] of Object.entries(row)) {
            const k = String(key).trim().replace(/^"|"$/g, '');
            if (k)
                out[k] = value === undefined || value === null ? '' : String(value).trim();
        }
        return out;
    });
};
exports.readSuumoCsv = readSuumoCsv;
/**
 * 何日前までを送るか。SUUMO_KAERU_DAYS が `all` なら null（すべて）。数字でなければ 3。
 * ⚠️ 0 は「今日の分だけ」。
 */
const recentDays = (raw = process.env.SUUMO_KAERU_DAYS) => {
    const v = (raw ?? '').trim().toLowerCase();
    if (v === 'all')
        return null;
    const n = Number(v);
    return v !== '' && Number.isInteger(n) && n >= 0 ? n : DEFAULT_DAYS;
};
exports.recentDays = recentDays;
/**
 * 送る範囲の始まり（日本時間の `YYYY/MM/DD 00:00:00`）。days が null なら null（絞らない）。
 * ⚠️ CSV の日時は comparableDate で同じ形にそろえてから、文字の大小で比べる。
 */
const recentCutoff = (days = (0, exports.recentDays)(), now = new Date()) => {
    if (days === null)
        return null;
    const jst = new Date(now.getTime() + JST_MS - days * DAY_MS);
    return `${jst.toISOString().slice(0, 10).replace(/-/g, '/')} 00:00:00`;
};
exports.recentCutoff = recentCutoff;
/**
 * CSV の日時を、比べられる形（`YYYY/MM/DD HH:MM:SS`）にそろえる。日時でなければ null（空欄・「-」など）。
 * ⚠️ 顧客の「追客状況の最終更新日時」だけ `2026/9/7` のようにゼロ埋めが無く、時刻も無い（2026-11-11 の CSV）。
 *   ⚠️ そのまま文字で比べると `2026/9/7` > `2026/11/08` になってしまう。
 */
const comparableDate = (v) => {
    const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(v.trim());
    if (!m)
        return null;
    const p = (s) => (s ?? '0').padStart(2, '0');
    return `${m[1]}/${p(m[2])}/${p(m[3])} ${p(m[4])}:${p(m[5])}:${p(m[6])}`;
};
exports.comparableDate = comparableDate;
const filterRecent = (rows, columns, cutoff) => {
    if (cutoff === null)
        return rows;
    return rows.filter((row) => columns.some((c) => {
        const d = (0, exports.comparableDate)(row[c] ?? '');
        return d !== null && d >= cutoff;
    }));
};
/** 反響ごとの CSV から、過去3日（既定）の行だけを残す */
const filterRecentActions = (rows, cutoff = (0, exports.recentCutoff)()) => filterRecent(rows, ACTION_DATE_COLUMNS, cutoff);
exports.filterRecentActions = filterRecentActions;
/** 顧客ごとの CSV から、過去3日（既定）に動きのあった行だけを残す */
const filterRecentCustomers = (rows, cutoff = (0, exports.recentCutoff)()) => filterRecent(rows, CUSTOMER_DATE_COLUMNS, cutoff);
exports.filterRecentCustomers = filterRecentCustomers;
/** 反響の1行を、② へ送る形にする（remarks は CSV の全項目。反響一覧の備考になる） */
const mapAction = (row) => {
    const out = {};
    const remarks = [];
    for (const [key, value] of Object.entries(row)) {
        remarks.push(`${key}：${value}`);
        const mapped = exports.ACTION_HEADER_MAP[key];
        if (mapped)
            out[mapped] = value;
    }
    out.remarks = remarks.join('\n');
    return out;
};
exports.mapAction = mapAction;
/** 顧客の1行を、① へ送る形にする（remarks は CSV の全項目。⚠️ 以前の runSuumoKaeru.ts の mapRecord と同じ） */
const mapCustomer = (row) => {
    const out = {};
    const remarks = [];
    for (const [key, value] of Object.entries(row)) {
        remarks.push(`${key}：${value}`);
        const mapped = exports.CUSTOMER_HEADER_MAP[key];
        if (!mapped)
            continue;
        if (CUSTOMER_NUMERIC.has(mapped)) {
            const n = Number(value.replace(/[,，\s]|万円|円/g, ''));
            out[mapped] = Number.isNaN(n) ? 0 : n;
        }
        else {
            out[mapped] = value;
        }
    }
    out.remarks = remarks.join('\n');
    return out;
};
exports.mapCustomer = mapCustomer;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errorText = (err) => axios_1.default.isAxiosError(err) ? `${err.response?.status ?? ''} ${JSON.stringify(err.response?.data ?? err.message)}`.trim() : err instanceof Error ? err.message : String(err);
/**
 * 反響ごとの CSV（action_list_*.csv）を読み、過去3日（既定）の分を ② の suumo_kaeru:actions へ送る。
 *
 * ⚠️ 失敗の理由は errors に足す（呼び出し元が sendErrorMail で実行結果に残す）。例外は投げない。
 * ⚠️ 合い言葉は SYNC_LOG_SECRET（sync の実行結果と同じ）。未設定なら送らずに失敗として残す。
 */
const importSuumoKaeruActions = async (csvPath, errors) => {
    const totals = { parsed: 0, recent: 0, result: {} };
    try {
        const all = await (0, exports.readSuumoCsv)(csvPath);
        const cutoff = (0, exports.recentCutoff)();
        const recent = (0, exports.filterRecentActions)(all, cutoff);
        totals.parsed = all.length;
        totals.recent = recent.length;
        console.log(`[SUUMO 反響] CSV ${all.length}件 → 送る ${recent.length}件（${cutoff === null ? 'すべて' : `${cutoff} 以降`}）`);
        if (recent.length === 0)
            return totals;
        const key = process.env.SYNC_LOG_SECRET ?? '';
        if (key === '') {
            errors.push('SUUMO の反響を送れませんでした: SYNC_LOG_SECRET が未設定です');
            return totals;
        }
        const rows = recent.map(exports.mapAction);
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            const label = `${i + 1}〜${i + chunk.length}件目`;
            let lastError = '';
            let done = false;
            for (let attempt = 0; attempt <= RETRY_COUNT && !done; attempt++) {
                try {
                    const res = await axios_1.default.post(ACTIONS_URL, { request: 'suumo_kaeru', roll: 'actions', key, rows: chunk }, {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 120000,
                    });
                    if (res.data?.status !== 'success')
                        throw new Error(JSON.stringify(res.data));
                    for (const [name, value] of Object.entries(res.data)) {
                        if (typeof value === 'number')
                            totals.result[name] = (totals.result[name] ?? 0) + value;
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
                errors.push(`SUUMO の反響（${label}）を送れませんでした: ${lastError}`);
        }
        console.log(`[SUUMO 反響] 結果 ${JSON.stringify(totals.result)}`);
    }
    catch (err) {
        errors.push(`SUUMO の反響の CSV を読めませんでした: ${errorText(err)}`);
    }
    return totals;
};
exports.importSuumoKaeruActions = importSuumoKaeruActions;
/**
 * 顧客ごとの CSV（customer_list_*.csv）を読み、過去3日（既定）に動きのあった分を ① の suumo_db_kaeru へ送る。
 *
 * ⚠️ 失敗の理由は errors に足す（以前は送れなかった塊がコンソールとファイルにしか残らず、「成功」に隠れていた）。例外は投げない。
 * ⚠️ ① の応答は { ok, inserted, errors }。ok が false のときも失敗として残す。
 */
const importSuumoKaeruCustomers = async (csvPath, errors) => {
    const totals = { parsed: 0, recent: 0, sent: 0 };
    try {
        const all = await (0, exports.readSuumoCsv)(csvPath);
        const cutoff = (0, exports.recentCutoff)();
        const recent = (0, exports.filterRecentCustomers)(all, cutoff);
        totals.parsed = all.length;
        totals.recent = recent.length;
        console.log(`[SUUMO 顧客] CSV ${all.length}件 → 送る ${recent.length}件（${cutoff === null ? 'すべて' : `${cutoff} 以降`}）`);
        const rows = recent.map(exports.mapCustomer);
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            const label = `${i + 1}〜${i + chunk.length}件目`;
            let lastError = '';
            let done = false;
            for (let attempt = 0; attempt <= RETRY_COUNT && !done; attempt++) {
                try {
                    const res = await axios_1.default.post(CUSTOMERS_URL, { request: 'suumo_db_kaeru', data: chunk }, {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 60000,
                    });
                    if (res.data?.ok !== true)
                        throw new Error(JSON.stringify(res.data));
                    totals.sent += chunk.length;
                    done = true;
                }
                catch (err) {
                    lastError = errorText(err);
                    if (attempt < RETRY_COUNT)
                        await sleep(RETRY_DELAY_MS);
                }
            }
            if (!done)
                errors.push(`SUUMO の顧客（${label}）を送れませんでした: ${lastError}`);
        }
        console.log(`[SUUMO 顧客] 送った ${totals.sent}件`);
    }
    catch (err) {
        errors.push(`SUUMO の顧客の CSV を読めませんでした: ${errorText(err)}`);
    }
    return totals;
};
exports.importSuumoKaeruCustomers = importSuumoKaeruCustomers;

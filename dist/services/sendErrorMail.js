"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendErrorMail = void 0;
const syncLog_1 = require("../utils/syncLog");
/**
 * 失敗の理由を残す。
 *
 * ⚠️⚠️ 2026-11-10 から**メールは送らない**（利用者の決定）。名前は呼び出し元（32ファイル）を変えずに済むよう残した。
 *   理由は、今のタスク（入口）の実行結果に足され、Dashboard の DB（sync_run_log）に残る（utils/syncLog.ts）。
 *   画面は Dashboard のシステム管理 →「同期の実行結果」。
 *   ⚠️ 以前は Gmail で送っていたが、認証が切れて（535）届かなくなっていた。
 * ⚠️ 渡した配列は空にする（以前と同じ。呼び出し元がモジュールの配列を使い回しているため）
 */
const sendErrorMail = async (errors, project) => {
    if (errors.length === 0)
        return;
    (0, syncLog_1.recordErrors)(errors, project);
    errors.length = 0;
};
exports.sendErrorMail = sendErrorMail;

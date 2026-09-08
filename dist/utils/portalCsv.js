"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripExcelFormula = exports.mapColumns = exports.parseCsv = exports.readTabSeparatedText = exports.readSjisText = exports.formatDate = exports.portalTmpPath = exports.portalTmpDir = void 0;
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const encoding_japanese_1 = __importDefault(require("encoding-japanese"));
const sync_1 = require("csv-parse/sync");
/** ポータルからのダウンロードファイルを置く一時ディレクトリ */
const portalTmpDir = () => {
    const dir = (0, path_1.join)((0, os_1.tmpdir)(), "portal");
    if (!(0, fs_1.existsSync)(dir))
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    return dir;
};
exports.portalTmpDir = portalTmpDir;
/** 一時ディレクトリ配下のパスを組み立てる */
const portalTmpPath = (fileName) => (0, path_1.join)((0, exports.portalTmpDir)(), fileName);
exports.portalTmpPath = portalTmpPath;
/** YYYYMMDD 形式（移植元 reload*.js の formatDate と同一） */
const formatDate = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
exports.formatDate = formatDate;
/**
 * Shift_JIS のファイルを読み込み UTF-8 文字列として返す。
 * 移植元では変換結果をファイルへ書き戻していたが、そのまま文字列で扱う。
 */
const readSjisText = async (filePath) => {
    const buffer = await (0, promises_1.readFile)(filePath);
    const unicodeArray = encoding_japanese_1.default.convert(buffer, { to: "UNICODE", from: "SJIS" });
    return encoding_japanese_1.default.codeToString(unicodeArray);
};
exports.readSjisText = readSjisText;
/**
 * タブ区切りファイルを読み込む。
 * SUUMO は通常 Shift_JIS で配信されるが UTF-8 のことがあるため、
 * 変換後に文字化け（U+FFFD）が多い方を捨てて、区切り文字を含む方を採用する。
 */
const readTabSeparatedText = async (filePath) => {
    const buffer = await (0, promises_1.readFile)(filePath);
    const asSjis = encoding_japanese_1.default.codeToString(encoding_japanese_1.default.convert(buffer, { to: "UNICODE", from: "SJIS" }));
    const asUtf8 = buffer.toString("utf8");
    const brokenCount = (text) => (text.match(/�/g) ?? []).length;
    // タブを含まない＝区切りとして成立していないので、もう一方を採用する
    if (!asSjis.includes("\t") && asUtf8.includes("\t"))
        return asUtf8;
    if (!asUtf8.includes("\t") && asSjis.includes("\t"))
        return asSjis;
    return brokenCount(asSjis) <= brokenCount(asUtf8) ? asSjis : asUtf8;
};
exports.readTabSeparatedText = readTabSeparatedText;
/** CSV 文字列をヘッダー付きでパースする */
const parseCsv = (text) => (0, sync_1.parse)(text, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
    trim: true
});
exports.parseCsv = parseCsv;
/** 日本語ヘッダーを columnMapping に従って英字キーへ置き換える（未定義のキーはそのまま残す） */
const mapColumns = (row, columnMapping) => {
    const mapped = {};
    for (const [key, value] of Object.entries(row)) {
        mapped[columnMapping[key] ?? key] = value ?? "";
    }
    return mapped;
};
exports.mapColumns = mapColumns;
/**
 * タウンライフの CSV に混入する Excel 由来の装飾（="09012345678" 形式）を取り除く。
 * 移植元ではそのまま DB へ入っていたため、ここで除去する。
 */
const stripExcelFormula = (value) => {
    if (!value)
        return "";
    return value.replace(/^\s*=?\s*"?/, "").replace(/"?\s*$/, "").trim();
};
exports.stripExcelFormula = stripExcelFormula;

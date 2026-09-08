import { readFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import Encoding from "encoding-japanese";
import { parse } from "csv-parse/sync";

/** ポータルからのダウンロードファイルを置く一時ディレクトリ */
export const portalTmpDir = (): string => {
    const dir = join(tmpdir(), "portal");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
};

/** 一時ディレクトリ配下のパスを組み立てる */
export const portalTmpPath = (fileName: string): string => join(portalTmpDir(), fileName);

/** YYYYMMDD 形式（移植元 reload*.js の formatDate と同一） */
export const formatDate = (d: Date): string =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/**
 * Shift_JIS のファイルを読み込み UTF-8 文字列として返す。
 * 移植元では変換結果をファイルへ書き戻していたが、そのまま文字列で扱う。
 */
export const readSjisText = async (filePath: string): Promise<string> => {
    const buffer = await readFile(filePath);
    const unicodeArray = Encoding.convert(buffer, { to: "UNICODE", from: "SJIS" });
    return Encoding.codeToString(unicodeArray);
};

/**
 * タブ区切りファイルを読み込む。
 * SUUMO は通常 Shift_JIS で配信されるが UTF-8 のことがあるため、
 * 変換後に文字化け（U+FFFD）が多い方を捨てて、区切り文字を含む方を採用する。
 */
export const readTabSeparatedText = async (filePath: string): Promise<string> => {
    const buffer = await readFile(filePath);

    const asSjis = Encoding.codeToString(
        Encoding.convert(buffer, { to: "UNICODE", from: "SJIS" })
    );
    const asUtf8 = buffer.toString("utf8");

    const brokenCount = (text: string): number => (text.match(/�/g) ?? []).length;

    // タブを含まない＝区切りとして成立していないので、もう一方を採用する
    if (!asSjis.includes("\t") && asUtf8.includes("\t")) return asUtf8;
    if (!asUtf8.includes("\t") && asSjis.includes("\t")) return asSjis;

    return brokenCount(asSjis) <= brokenCount(asUtf8) ? asSjis : asUtf8;
};

/** CSV 文字列をヘッダー付きでパースする */
export const parseCsv = (text: string): Record<string, string>[] =>
    parse(text, {
        bom: true,
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        relax_quotes: true,
        trim: true
    }) as Record<string, string>[];

/** 日本語ヘッダーを columnMapping に従って英字キーへ置き換える（未定義のキーはそのまま残す） */
export const mapColumns = (
    row: Record<string, string>,
    columnMapping: Record<string, string>
): Record<string, string> => {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
        mapped[columnMapping[key] ?? key] = value ?? "";
    }
    return mapped;
};

/**
 * タウンライフの CSV に混入する Excel 由来の装飾（="09012345678" 形式）を取り除く。
 * 移植元ではそのまま DB へ入っていたため、ここで除去する。
 */
export const stripExcelFormula = (value: string | undefined): string => {
    if (!value) return "";
    return value.replace(/^\s*=?\s*"?/, "").replace(/"?\s*$/, "").trim();
};

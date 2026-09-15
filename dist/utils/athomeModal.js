"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dismissAthomeModal = void 0;
const portalPage_1 = require("./portalPage");
/**
 * at home（ATBB）の約款・お知らせモーダルを閉じる。
 *
 * ─────────────────────────────────────────────
 * ⚠️⚠️ **これが無いと、要素は見つかるのにクリックできない。**
 *
 *   2026-09-09 の実行ログ:
 *
 *     locator resolved to <a class="header_link">アクセスログ・反響</a>
 *       - element is visible, enabled and stable      ← 要素は正常
 *       - <iframe id="clause_frame"
 *           src="/www_athome/tool/yakkan/include20260909.html">
 *         from <div id="colorbox" role="dialog"> subtree intercepts pointer events
 *
 *   `yakkan` は約款、`include20260909.html` の数字は**その日の日付**。
 *   約款が更新された日に同意モーダル（jQuery ColorBox）が最前面に出て、
 *   クリックを奪う。Playwright は30秒間リトライし続けて timeout する。
 *
 * ⚠️⚠️ **`force: true` で回避してはいけない。**
 *   モーダルを残したまま裏の要素を押すことになり、
 *   「約款に同意しないまま操作する」形になる。必ず閉じてから進む。
 *
 * ⚠️ モーダルが出ない日が大半なので、**出ていなければ即座に返る**。
 *   毎回待つと1タスクあたり数秒の無駄が積み上がる。
 * ─────────────────────────────────────────────
 *
 * ⚠️ 同意ボタンの位置は2通りありうる。両方試す。
 *   (a) `#colorbox` の中（iframe の外）… ColorBox が用意する枠側のボタン
 *   (b) `#clause_frame` の中           … 約款HTML自体が持つボタン
 *
 * @returns モーダルを閉じたら true、そもそも出ていなければ false
 */
/** モーダルの本体。⚠️ ColorBox は閉じても DOM に残り display:none になる */
const MODAL = '#colorbox';
/**
 * 同意・閉じるボタンの候補。
 * ⚠️ 上から順に試す。同意（承諾）を先に置くこと。
 *   閉じるだけだと次回も出続ける可能性がある。
 */
const AGREE_TEXTS = ['同意', '承諾', '確認しました', 'OK', '閉じる'];
const isVisible = async (page, selector) => {
    // ⚠️ 要素が無い場合 isVisible() は false を返すが、
    //   ページ遷移中は例外になることがあるので catch する
    return page.locator(selector).isVisible().catch(() => false);
};
const dismissAthomeModal = async (page) => {
    if (!(await isVisible(page, MODAL)))
        return false;
    console.log('[at home] 約款・お知らせのモーダルを検出しました。閉じます...');
    // --- (a) #colorbox の中のボタン（iframe の外） ---
    for (const text of AGREE_TEXTS) {
        const button = page
            .locator(`${MODAL} button, ${MODAL} a, ${MODAL} input[type="button"], ${MODAL} input[type="submit"]`)
            .filter({ hasText: text })
            .first();
        // ⚠️ timeout を短くする。候補を順に試すので、1つで長く待つと全体が遅い
        const clicked = await button.click({ timeout: 3000 }).then(() => true).catch(() => false);
        if (clicked) {
            console.log(`[at home] 「${text}」をクリックしました`);
            if (await waitClosed(page))
                return true;
        }
    }
    // --- (b) 約款 iframe の中のボタン ---
    // ⚠️ frameLocator は iframe が無くても例外にならないので、そのまま試す
    const frame = page.frameLocator('#clause_frame');
    for (const text of AGREE_TEXTS) {
        const button = frame
            .locator('button, a, input[type="button"], input[type="submit"]')
            .filter({ hasText: text })
            .first();
        const clicked = await button.click({ timeout: 3000 }).then(() => true).catch(() => false);
        if (clicked) {
            console.log(`[at home] 約款内の「${text}」をクリックしました`);
            if (await waitClosed(page))
                return true;
        }
    }
    // --- (c) ColorBox 標準の閉じるボタン ---
    // ⚠️ 最後の手段。同意を記録しないため次回も出る可能性がある
    const closed = await page
        .locator('#cboxClose')
        .click({ timeout: 3000 })
        .then(() => true)
        .catch(() => false);
    if (closed) {
        console.log('[at home] #cboxClose で閉じました（⚠️ 同意は記録されていない可能性があります）');
        if (await waitClosed(page))
            return true;
    }
    // --- 閉じられなかった ---
    // ⚠️⚠️ ここに来たらモーダルの作りが変わっている。
    //   HTMLとスクリーンショットを保存して、次回セレクタを直せるようにする。
    //   （ALLGRIT の不具合でもこの手順が有効だった）
    await (0, portalPage_1.logPageState)(page, 'athome-modal-not-closed');
    throw new Error('at home の約款・お知らせモーダルを閉じられませんでした。' +
        '保存したHTMLとスクリーンショットで #colorbox の中身を確認し、' +
        'src/utils/athomeModal.ts の AGREE_TEXTS とセレクタを見直してください。');
};
exports.dismissAthomeModal = dismissAthomeModal;
/**
 * モーダルが消えるのを待つ。
 * ⚠️ 消えない＝押したボタンが同意ボタンではなかった、ということ。
 *   false を返して次の候補を試させる。
 */
const waitClosed = async (page) => page
    .locator(MODAL)
    .waitFor({ state: 'hidden', timeout: 10000 })
    .then(() => true)
    .catch(() => false);

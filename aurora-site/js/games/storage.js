/** 小游戏成绩持久化：localStorage 不可用（隐私模式、被禁用）时静默降级，不影响游戏本身。 */

/** 统一个给成绩键加前缀，避免与主题等其它 key 混在一起。 */
export const SCORE_PREFIX = 'aurora:games:';

/** 成绩键：俄罗斯方块最高分、2048 最高分、扫雷按难度记录的最快用时。 */
export const SCORE_KEYS = {
    tetris: `${SCORE_PREFIX}tetris:best`,
    game2048: `${SCORE_PREFIX}2048:best`,
    minesweeper: (difficulty) => `${SCORE_PREFIX}minesweeper:best:${difficulty}`,
};

/**
 * 读取成绩。
 * @returns {number|null} 无记录、内容非法或存储不可用时返回 null。
 */
export function readScore(key) {
    try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return null;

        const value = Number(raw);
        return Number.isFinite(value) ? value : null;
    } catch (err) {
        return null;
    }
}

/**
 * 写入成绩，仅在优于旧记录时落盘。
 * @param {boolean} lowerIsBetter 用时类成绩传 true（越小越好）
 * @returns {boolean} 是否刷新了记录
 */
export function writeScore(key, value, lowerIsBetter = false) {
    const previous = readScore(key);
    const isBetter =
        previous === null || (lowerIsBetter ? value < previous : value > previous);
    if (!isBetter) return false;

    try {
        window.localStorage.setItem(key, String(value));
    } catch (err) {
        /* 存储不可用时只提示当次成绩，不打断游戏 */
    }
    return true;
}

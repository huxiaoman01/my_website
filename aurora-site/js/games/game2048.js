/** 2048：4×4 网格，方向键 / WASD / 滑动操作，含单步撤销与本机最高分。 */

import { readScore, SCORE_KEYS, writeScore } from './storage.js';

const SIZE = 4;
const CELL_COUNT = SIZE * SIZE;
const WIN_VALUE = 2048;
const SWIPE_THRESHOLD = 24;

const TEMPLATE = `
<div class="game-shell game2048-shell">
    <div class="game-toolbar">
        <div class="game-hud game-hud--compact">
            <div class="game-stat"><span class="game-stat__label">分数</span><strong data-role="score">0</strong></div>
            <div class="game-stat"><span class="game-stat__label">最高分</span><strong data-role="best">0</strong></div>
        </div>
        <div class="game-actions">
            <button type="button" class="game-btn" data-role="undo">撤销一步</button>
            <button type="button" class="game-btn" data-role="restart">新游戏</button>
        </div>
    </div>
    <div class="game2048-wrap">
        <div class="game2048-board" data-role="board" role="grid" aria-label="2048 棋盘"></div>
        <div class="game-overlay game-overlay--float" data-role="overlay">
            <p class="game-overlay__title" data-role="overlay-title"></p>
            <p class="game-overlay__text" data-role="overlay-text"></p>
            <button type="button" class="game-btn game-btn--primary" data-role="overlay-action">继续</button>
        </div>
    </div>
    <p class="game-hint">方向键 / WASD 移动，手机可直接在棋盘上滑动。</p>
</div>
`;

/**
 * 挂载 2048。
 * @param {HTMLElement} root 承载游戏的容器
 * @returns {{destroy: Function, pause: Function, resume: Function}}
 */
export function mountGame2048(root) {
    root.innerHTML = TEMPLATE;

    const boardEl = root.querySelector('[data-role="board"]');
    const scoreEl = root.querySelector('[data-role="score"]');
    const bestEl = root.querySelector('[data-role="best"]');
    const undoButton = root.querySelector('[data-role="undo"]');
    const restartButton = root.querySelector('[data-role="restart"]');
    const overlay = root.querySelector('[data-role="overlay"]');
    const overlayTitle = root.querySelector('[data-role="overlay-title"]');
    const overlayText = root.querySelector('[data-role="overlay-text"]');
    const overlayAction = root.querySelector('[data-role="overlay-action"]');

    const tileEls = Array.from({ length: CELL_COUNT }, (_, index) => {
        const tile = document.createElement('div');
        tile.className = 'game2048-tile is-empty';
        tile.setAttribute('role', 'gridcell');
        tile.dataset.index = String(index);
        boardEl.appendChild(tile);
        return tile;
    });

    let grid = [];
    let score = 0;
    let best = readScore(SCORE_KEYS.game2048) ?? 0;
    let history = null;
    let finished = false;
    let won = false;
    let spawnIndex = -1;
    let mergedIndexes = [];
    let overlayHandler = null;
    let touchStart = null;

    bestEl.textContent = String(best);

    function createEmptyGrid() {
        return Array(CELL_COUNT).fill(0);
    }

    function refreshStats() {
        scoreEl.textContent = String(score);
        bestEl.textContent = String(best);
        undoButton.disabled = history === null;
    }

    function emptyIndexes(source = grid) {
        return source.reduce((list, value, index) => {
            if (value === 0) list.push(index);
            return list;
        }, []);
    }

    /** 随机落一个 2（90%）或 4，返回落点索引，用于播放出现动画。 */
    function spawnTile() {
        const empties = emptyIndexes();
        if (!empties.length) {
            spawnIndex = -1;
            return;
        }

        const index = empties[Math.floor(Math.random() * empties.length)];
        grid[index] = Math.random() < 0.9 ? 2 : 4;
        spawnIndex = index;
    }

    function newGame() {
        grid = createEmptyGrid();
        score = 0;
        history = null;
        finished = false;
        won = false;
        spawnIndex = -1;
        mergedIndexes = [];

        overlay.classList.remove('is-visible');
        overlayHandler = null;
        spawnTile();
        spawnTile();
        refreshStats();
        render();
    }

    function lineIndexes(direction, line) {
        const indexes = [];
        for (let step = 0; step < SIZE; step += 1) {
            if (direction === 'left') indexes.push(line * SIZE + step);
            else if (direction === 'right') indexes.push(line * SIZE + (SIZE - 1 - step));
            else if (direction === 'up') indexes.push(step * SIZE + line);
            else indexes.push((SIZE - 1 - step) * SIZE + line);
        }
        return indexes;
    }

    function collapse(values) {
        const compact = values.filter((value) => value !== 0);
        const result = [];
        const mergedPositions = [];
        let gained = 0;

        for (let i = 0; i < compact.length; i += 1) {
            if (compact[i] === compact[i + 1]) {
                const merged = compact[i] * 2;
                result.push(merged);
                mergedPositions.push(result.length - 1);
                gained += merged;
                i += 1;
            } else {
                result.push(compact[i]);
            }
        }

        while (result.length < SIZE) result.push(0);
        return { result, gained, mergedPositions };
    }

    function move(direction) {
        if (finished) return;

        const next = grid.slice();
        const merged = [];
        let gained = 0;

        for (let line = 0; line < SIZE; line += 1) {
            const indexes = lineIndexes(direction, line);
            const values = indexes.map((index) => grid[index]);
            const { result, gained: lineGain, mergedPositions } = collapse(values);
            gained += lineGain;

            indexes.forEach((index, position) => {
                next[index] = result[position];
            });
            mergedPositions.forEach((position) => merged.push(indexes[position]));
        }

        if (next.every((value, index) => value === grid[index])) return;

        history = { grid: grid.slice(), score, won };
        grid = next;
        score += gained;
        mergedIndexes = merged;
        spawnIndex = -1;
        spawnTile();
        refreshStats();
        render();

        if (score > best) {
            best = score;
            writeScore(SCORE_KEYS.game2048, score);
            refreshStats();
        }

        if (!won && grid.includes(WIN_VALUE)) {
            won = true;
            showOverlay('达成 2048！', '可以继续往上冲，也可以重开一局。', '继续挑战', () => {
                hideOverlay();
            });
            return;
        }

        if (isStuck()) {
            finished = true;
            showOverlay('没有可走的方向了', `本局 ${score} 分，最高分 ${best} 分。`, '再来一局', () => {
                hideOverlay();
                newGame();
            });
        }
    }

    function isStuck() {
        if (emptyIndexes().length) return false;

        for (let row = 0; row < SIZE; row += 1) {
            for (let col = 0; col < SIZE; col += 1) {
                const value = grid[row * SIZE + col];
                if (col + 1 < SIZE && value === grid[row * SIZE + col + 1]) return false;
                if (row + 1 < SIZE && value === grid[(row + 1) * SIZE + col]) return false;
            }
        }
        return true;
    }

    function undo() {
        if (!history) return;

        grid = history.grid;
        score = history.score;
        won = history.won;
        history = null;
        finished = false;
        spawnIndex = -1;
        mergedIndexes = [];

        hideOverlay();
        refreshStats();
        render();
    }

    function tileClass(value) {
        if (value === 0) return 'game2048-tile is-empty';
        if (value > WIN_VALUE) return 'game2048-tile tile-super';
        return `game2048-tile tile-${value}`;
    }

    function render() {
        tileEls.forEach((el, index) => {
            const value = grid[index];
            el.className = tileClass(value);
            el.textContent = value ? String(value) : '';
            el.setAttribute('aria-label', value ? `第 ${index + 1} 格，${value}` : '空格');
        });

        // 动画类需要先移除再加回来，否则同一个格子的重复合并不会重播动画
        const animated = [...mergedIndexes, spawnIndex].filter((index) => index >= 0);
        animated.forEach((index, order) => {
            const el = tileEls[index];
            el.classList.remove('is-new', 'is-merged');
            // 读取一次布局属性，强制浏览器重排，让动画类真正生效
            void el.offsetWidth;
            el.classList.add(mergedIndexes.includes(index) ? 'is-merged' : 'is-new');
            el.style.setProperty('--tile-delay', `${order * 40}ms`);
        });
    }

    function showOverlay(title, text, actionLabel, onAction) {
        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlayAction.textContent = actionLabel;
        overlayHandler = onAction;
        overlay.classList.add('is-visible');
    }

    function hideOverlay() {
        overlay.classList.remove('is-visible');
        overlayHandler = null;
    }

    const KEY_DIRECTIONS = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
        a: 'left',
        d: 'right',
        w: 'up',
        s: 'down',
    };

    function handleKeyDown(event) {
        const tag = event.target instanceof HTMLElement ? event.target.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        const direction = KEY_DIRECTIONS[event.key] || KEY_DIRECTIONS[event.key.toLowerCase()];
        if (!direction) return;

        event.preventDefault();
        move(direction);
    }

    function handleTouchStart(event) {
        const touch = event.changedTouches[0];
        touchStart = { x: touch.clientX, y: touch.clientY };
    }

    function handleTouchEnd(event) {
        if (!touchStart) return;

        const touch = event.changedTouches[0];
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        touchStart = null;

        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

        event.preventDefault();
        if (Math.abs(dx) > Math.abs(dy)) {
            move(dx > 0 ? 'right' : 'left');
        } else {
            move(dy > 0 ? 'down' : 'up');
        }
    }

    restartButton.addEventListener('click', newGame);
    undoButton.addEventListener('click', undo);
    overlay.addEventListener('click', (event) => {
        if (event.target !== overlayAction || typeof overlayHandler !== 'function') return;
        overlayHandler();
    });
    window.addEventListener('keydown', handleKeyDown);
    boardEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    boardEl.addEventListener('touchend', handleTouchEnd);

    newGame();

    return {
        destroy() {
            window.removeEventListener('keydown', handleKeyDown);
            root.innerHTML = '';
        },
        // 2048 是回合制，没有需要暂停的计时器，保留接口以统一装配层调用
        pause() {},
        resume() {},
    };
}

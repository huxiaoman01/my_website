/** 扫雷：三档难度，首点必安全，支持插旗、和弦展开与最快用时记录。 */

import { readScore, SCORE_KEYS, writeScore } from './storage.js';

const DIFFICULTIES = {
    beginner: { label: '初级 9×9 / 10 雷', cols: 9, rows: 9, mines: 10 },
    intermediate: { label: '中级 16×16 / 40 雷', cols: 16, rows: 16, mines: 40 },
    expert: { label: '高级 30×16 / 99 雷', cols: 30, rows: 16, mines: 99 },
};

const DEFAULT_DIFFICULTY = 'beginner';
const LONG_PRESS_MS = 420;
const MIN_CELL = 18;
const MAX_CELL = 34;

const TEMPLATE = `
<div class="game-shell minesweeper-shell">
    <div class="game-toolbar">
        <label class="game-select">
            <span>难度</span>
            <select data-role="difficulty">
                <option value="beginner">初级 9×9 / 10 雷</option>
                <option value="intermediate">中级 16×16 / 40 雷</option>
                <option value="expert">高级 30×16 / 99 雷</option>
            </select>
        </label>
        <div class="game-hud game-hud--compact">
            <div class="game-stat"><span class="game-stat__label">剩余雷数</span><strong data-role="mines">10</strong></div>
            <div class="game-stat"><span class="game-stat__label">用时</span><strong data-role="time">0s</strong></div>
            <div class="game-stat"><span class="game-stat__label">最快</span><strong data-role="best">—</strong></div>
        </div>
        <button type="button" class="game-btn" data-role="restart">重新开始</button>
    </div>
    <div class="mine-board-wrap">
        <div class="mine-board" data-role="board" aria-label="扫雷棋盘"></div>
    </div>
    <p class="game-hint">轻点两次才翻开（第一下只是选中），右键或长按插旗；双击已翻开的数字可快速展开周围。</p>
    <div class="game-overlay game-overlay--float" data-role="overlay">
        <p class="game-overlay__title" data-role="overlay-title"></p>
        <p class="game-overlay__text" data-role="overlay-text"></p>
        <button type="button" class="game-btn game-btn--primary" data-role="overlay-action">再来一局</button>
    </div>
</div>
`;

/**
 * 挂载扫雷。
 * @param {HTMLElement} root 承载游戏的容器
 * @returns {{destroy: Function, pause: Function, resume: Function}}
 */
export function mountMinesweeperGame(root) {
    root.innerHTML = TEMPLATE;

    const boardEl = root.querySelector('[data-role="board"]');
    const boardWrap = root.querySelector('.mine-board-wrap');
    const difficultySelect = root.querySelector('[data-role="difficulty"]');
    const minesEl = root.querySelector('[data-role="mines"]');
    const timeEl = root.querySelector('[data-role="time"]');
    const bestEl = root.querySelector('[data-role="best"]');
    const restartButton = root.querySelector('[data-role="restart"]');
    const overlay = root.querySelector('[data-role="overlay"]');
    const overlayTitle = root.querySelector('[data-role="overlay-title"]');
    const overlayText = root.querySelector('[data-role="overlay-text"]');
    const overlayAction = root.querySelector('[data-role="overlay-action"]');

    let difficulty = DEFAULT_DIFFICULTY;
    let config = DIFFICULTIES[difficulty];
    let cells = [];
    let cellEls = [];
    let placed = false;
    let finished = false;
    let flagged = 0;
    let revealedCount = 0;
    let seconds = 0;
    let timerId = 0;
    let timerPaused = false;
    let longPressTimer = 0;
    let longPressHandled = false;
    let suppressNextClick = false;
    /** 两次点击模式的中间态：第一下只选中，再点同一格才真正翻开 */
    let pendingIndex = -1;
    let resizeFrame = 0;

    function createCells() {
        return Array.from({ length: config.cols * config.rows }, () => ({
            mine: false,
            revealed: false,
            flagged: false,
            count: 0,
        }));
    }

    function indexOf(row, col) {
        return row * config.cols + col;
    }

    function neighbors(index) {
        const row = Math.floor(index / config.cols);
        const col = index % config.cols;
        const result = [];

        for (let dr = -1; dr <= 1; dr += 1) {
            for (let dc = -1; dc <= 1; dc += 1) {
                if (dr === 0 && dc === 0) continue;

                const r = row + dr;
                const c = col + dc;
                if (r < 0 || r >= config.rows || c < 0 || c >= config.cols) continue;
                result.push(indexOf(r, c));
            }
        }
        return result;
    }

    /** 首点必安全：布雷时排除点击格及其八邻域，保证第一下总能展开一片。 */
    function placeMines(safeIndex) {
        const excluded = new Set([safeIndex, ...neighbors(safeIndex)]);
        const candidates = [];

        for (let i = 0; i < cells.length; i += 1) {
            if (!excluded.has(i)) candidates.push(i);
        }

        const mineCount = Math.min(config.mines, candidates.length);
        for (let i = candidates.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        candidates.slice(0, mineCount).forEach((index) => {
            cells[index].mine = true;
        });

        cells.forEach((cell, index) => {
            cell.count = cell.mine ? 0 : neighbors(index).filter((n) => cells[n].mine).length;
        });
        placed = true;
    }

    function startTimer() {
        if (timerId || finished) return;

        timerId = window.setInterval(() => {
            if (timerPaused) return;

            seconds += 1;
            timeEl.textContent = `${seconds}s`;
        }, 1000);
    }

    function stopTimer() {
        window.clearInterval(timerId);
        timerId = 0;
    }

    function formatBest(value) {
        return value === null ? '—' : `${value}s`;
    }

    function refreshBest() {
        bestEl.textContent = formatBest(readScore(SCORE_KEYS.minesweeper(difficulty)));
    }

    function resetGame() {
        stopTimer();
        config = DIFFICULTIES[difficulty];
        cells = createCells();
        placed = false;
        finished = false;
        flagged = 0;
        revealedCount = 0;
        seconds = 0;
        timerPaused = false;

        minesEl.textContent = String(config.mines);
        timeEl.textContent = '0s';
        overlay.classList.remove('is-visible');
        refreshBest();
        renderBoard();
    }

    function renderBoard() {
        boardEl.style.setProperty('--mine-cols', String(config.cols));
        boardEl.textContent = '';
        cellEls = cells.map((cell, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'mine-cell';
            button.dataset.index = String(index);
            boardEl.appendChild(button);
            return button;
        });

        updateCellSize();
        cells.forEach((cell, index) => paintCell(index));
    }

    function updateCellSize() {
        const available = boardWrap.clientWidth || config.cols * MAX_CELL;
        const size = Math.max(
            MIN_CELL,
            Math.min(MAX_CELL, Math.floor(available / config.cols) - 2),
        );
        boardEl.style.setProperty('--mine-cell', `${size}px`);
    }

    function paintCell(index) {
        const cell = cells[index];
        const el = cellEls[index];
        if (!el) return;

        const row = Math.floor(index / config.cols) + 1;
        const col = (index % config.cols) + 1;
        el.className = 'mine-cell';
        el.textContent = '';
        el.disabled = finished;

        if (cell.revealed) {
            el.classList.add('is-revealed');
            if (cell.mine) {
                el.classList.add('is-mine');
                el.textContent = '💣';
                el.setAttribute('aria-label', `第 ${row} 行第 ${col} 列，地雷`);
            } else if (cell.count > 0) {
                el.classList.add('is-number', `is-number-${cell.count}`);
                el.textContent = String(cell.count);
                el.setAttribute('aria-label', `第 ${row} 行第 ${col} 列，周围 ${cell.count} 颗雷`);
            } else {
                el.setAttribute('aria-label', `第 ${row} 行第 ${col} 列，空白`);
            }
        } else if (cell.flagged) {
            el.classList.add('is-flagged');
            el.textContent = '🚩';
            el.setAttribute('aria-label', `第 ${row} 行第 ${col} 列，已插旗`);
        } else if (index === pendingIndex) {
            el.classList.add('is-pending');
            el.setAttribute('aria-label', `第 ${row} 行第 ${col} 列，已选中，再点一次翻开`);
        } else {
            el.setAttribute('aria-label', `第 ${row} 行第 ${col} 列，未翻开`);
        }

        if (finished && cell.wrongFlag) el.classList.add('is-wrong');
    }

    function reveal(index) {
        const cell = cells[index];
        if (cell.revealed || cell.flagged) return;

        cell.revealed = true;
        revealedCount += 1;
        paintCell(index);

        if (cell.mine) {
            lose(index);
            return;
        }

        if (cell.count === 0) {
            // 空白区用显式栈展开，避免深递归在高级难度下爆栈
            const stack = [...neighbors(index)];
            while (stack.length) {
                const next = stack.pop();
                const target = cells[next];
                if (target.revealed || target.flagged || target.mine) continue;

                target.revealed = true;
                revealedCount += 1;
                paintCell(next);
                if (target.count === 0) stack.push(...neighbors(next));
            }
        }

        checkWin();
    }

    function toggleFlag(index) {
        const cell = cells[index];
        if (finished || cell.revealed) return;

        cell.flagged = !cell.flagged;
        flagged += cell.flagged ? 1 : -1;
        if (index === pendingIndex) pendingIndex = -1;
        minesEl.textContent = String(config.mines - flagged);
        paintCell(index);
    }

    /** 第一下只选中，避免手机上误触直接踩雷。 */
    function selectCell(index) {
        const previous = pendingIndex;
        pendingIndex = index;

        if (previous >= 0 && previous !== index) paintCell(previous);
        paintCell(index);
    }

    /** 和弦展开：已翻开的数字周围插旗数足够时，一次性展开其余邻格。 */
    function chord(index) {
        const cell = cells[index];
        if (finished || !cell.revealed || cell.count === 0) return;

        const around = neighbors(index);
        const flags = around.filter((n) => cells[n].flagged).length;
        if (flags !== cell.count) return;

        pendingIndex = -1;
        around.filter((n) => !cells[n].flagged && !cells[n].revealed).forEach((n) => reveal(n));
    }

    function handleReveal(index) {
        if (finished) return;

        if (!placed) {
            placeMines(index);
            startTimer();
        }
        reveal(index);
    }

    function checkWin() {
        const totalSafe = cells.length - config.mines;
        if (revealedCount < totalSafe) return;

        pendingIndex = -1;
        finished = true;
        stopTimer();

        const isBest = writeScore(SCORE_KEYS.minesweeper(difficulty), seconds, true);
        refreshBest();
        cells.forEach((cell, index) => paintCell(index));
        showOverlay(
            '扫雷成功',
            isBest ? `用时 ${seconds} 秒，刷新了本机最快纪录！` : `用时 ${seconds} 秒，本机最快 ${bestEl.textContent}。`,
        );
    }

    function lose(hitIndex) {
        pendingIndex = -1;
        finished = true;
        stopTimer();

        cells.forEach((cell, index) => {
            if (cell.mine && !cell.flagged) {
                cell.revealed = true;
            }
            cell.wrongFlag = Boolean(cell.flagged && !cell.mine);
            paintCell(index);
        });
        if (cellEls[hitIndex]) cellEls[hitIndex].classList.add('is-hit');

        showOverlay('踩到雷了', '再来一局试试。');
    }

    function showOverlay(title, text) {
        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlay.classList.add('is-visible');
    }

    function handleBoardClick(event) {
        const button = event.target.closest('.mine-cell');
        if (!button || !boardEl.contains(button)) return;
        // 长按已经在 touchend 阶段处理过插旗，这里丢掉随之而来的这一次点击
        if (suppressNextClick) {
            suppressNextClick = false;
            return;
        }

        const index = Number(button.dataset.index);
        const cell = cells[index];

        // 已翻开的数字：点它就和弦展开
        if (cell.revealed) {
            chord(index);
            return;
        }
        // 两次点击模式：第一下只选中，第二下才翻开
        if (index !== pendingIndex) {
            selectCell(index);
            return;
        }

        pendingIndex = -1;
        handleReveal(index);
    }

    function handleBoardDoubleClick(event) {
        const button = event.target.closest('.mine-cell');
        if (!button) return;

        chord(Number(button.dataset.index));
    }

    function handleContextMenu(event) {
        const button = event.target.closest('.mine-cell');
        if (!button) return;

        event.preventDefault();
        toggleFlag(Number(button.dataset.index));
    }

    function handleTouchStart(event) {
        const button = event.target.closest('.mine-cell');
        if (!button) return;

        longPressHandled = false;
        const index = Number(button.dataset.index);
        window.clearTimeout(longPressTimer);
        longPressTimer = window.setTimeout(() => {
            longPressHandled = true;
            suppressNextClick = true;
            toggleFlag(index);
        }, LONG_PRESS_MS);
    }

    function cancelLongPress() {
        window.clearTimeout(longPressTimer);
    }

    function handleTouchEnd(event) {
        window.clearTimeout(longPressTimer);
        if (!longPressHandled) return;

        // 长按已插旗，阻止这次点击再翻一次格子
        event.preventDefault();
        longPressHandled = false;
    }

    function handleResize() {
        if (resizeFrame) return;
        resizeFrame = window.requestAnimationFrame(() => {
            resizeFrame = 0;
            updateCellSize();
        });
    }

    difficultySelect.value = difficulty;
    difficultySelect.addEventListener('change', () => {
        difficulty = difficultySelect.value;
        resetGame();
    });
    restartButton.addEventListener('click', resetGame);
    overlayAction.addEventListener('click', resetGame);
    boardEl.addEventListener('click', handleBoardClick);
    boardEl.addEventListener('dblclick', handleBoardDoubleClick);
    boardEl.addEventListener('contextmenu', handleContextMenu);
    boardEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    boardEl.addEventListener('touchmove', cancelLongPress, { passive: true });
    boardEl.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('resize', handleResize);

    const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(handleResize) : null;
    if (resizeObserver) resizeObserver.observe(boardWrap);

    resetGame();

    return {
        destroy() {
            stopTimer();
            window.clearTimeout(longPressTimer);
            window.cancelAnimationFrame(resizeFrame);
            window.removeEventListener('resize', handleResize);
            if (resizeObserver) resizeObserver.disconnect();
            root.innerHTML = '';
        },
        pause() {
            timerPaused = true;
        },
        resume() {
            timerPaused = false;
        },
    };
}

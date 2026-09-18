/** 俄罗斯方块：10×20 棋盘，canvas 渲染，支持暂存、幽灵块、下一块预览与等级加速。 */

import { readScore, SCORE_KEYS, writeScore } from './storage.js';

const COLS = 10;
const ROWS = 20;
const NEXT_COUNT = 3;
const LINE_SCORES = [0, 100, 300, 500, 800];

/** 七种方块的基础形状，旋转时按顺时针 / 逆时针转动矩阵。 */
const SHAPES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
    ],
    O: [
        [1, 1],
        [1, 1],
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
    ],
};

/** 方块配色在明暗两套主题下都保持足够对比度，因此不随主题切换。 */
const COLORS = {
    I: '#38d2c7',
    J: '#6d8dff',
    L: '#ff9f6e',
    O: '#ffd166',
    S: '#7be0ad',
    T: '#b06bff',
    Z: '#ff6b9d',
};

const TEMPLATE = `
<div class="game-shell tetris-shell">
    <div class="game-hud">
        <div class="game-stat"><span class="game-stat__label">分数</span><strong data-role="score">0</strong></div>
        <div class="game-stat"><span class="game-stat__label">最高分</span><strong data-role="best">0</strong></div>
        <div class="game-stat"><span class="game-stat__label">等级</span><strong data-role="level">1</strong></div>
    </div>
    <div class="tetris-layout">
        <div class="tetris-stage">
            <canvas class="tetris-board" data-role="board" aria-label="俄罗斯方块棋盘"></canvas>
            <div class="game-overlay" data-role="overlay">
                <p class="game-overlay__title" data-role="overlay-title">俄罗斯方块</p>
                <p class="game-overlay__text" data-role="overlay-text">方向键移动，↑ 或 X 旋转，空格直接落底。</p>
                <button type="button" class="game-btn game-btn--primary" data-role="overlay-action">开始游戏</button>
            </div>
        </div>
        <div class="tetris-side">
            <div class="tetris-panel">
                <p class="tetris-panel__title">下一块</p>
                <div class="tetris-next" data-role="next"></div>
            </div>
            <div class="tetris-panel">
                <p class="tetris-panel__title">暂存</p>
                <canvas class="tetris-mini" data-role="hold" aria-label="暂存的方块"></canvas>
            </div>
        </div>
    </div>
    <div class="game-actions tetris-actions">
        <button type="button" class="game-btn" data-action="left">← 左移</button>
        <button type="button" class="game-btn" data-action="right">右移 →</button>
        <button type="button" class="game-btn" data-action="down">↓ 下移</button>
        <button type="button" class="game-btn" data-action="rotate">↻ 旋转</button>
        <button type="button" class="game-btn" data-action="drop">⤓ 落底</button>
        <button type="button" class="game-btn" data-action="hold">暂存</button>
        <button type="button" class="game-btn" data-action="pause">暂停</button>
    </div>
</div>
`;

/**
 * 挂载俄罗斯方块。
 * @param {HTMLElement} root 承载游戏的容器
 * @returns {{destroy: Function, pause: Function, resume: Function}}
 */
export function mountTetrisGame(root) {
    root.innerHTML = TEMPLATE;

    const boardCanvas = root.querySelector('[data-role="board"]');
    const holdCanvas = root.querySelector('[data-role="hold"]');
    const nextWrap = root.querySelector('[data-role="next"]');
    const overlay = root.querySelector('[data-role="overlay"]');
    const overlayTitle = root.querySelector('[data-role="overlay-title"]');
    const overlayText = root.querySelector('[data-role="overlay-text"]');
    const overlayAction = root.querySelector('[data-role="overlay-action"]');
    const scoreEl = root.querySelector('[data-role="score"]');
    const bestEl = root.querySelector('[data-role="best"]');
    const levelEl = root.querySelector('[data-role="level"]');
    const pauseButton = root.querySelector('[data-action="pause"]');

    const nextCanvases = Array.from({ length: NEXT_COUNT }, () => {
        const canvas = document.createElement('canvas');
        canvas.className = 'tetris-mini';
        canvas.setAttribute('aria-hidden', 'true');
        nextWrap.appendChild(canvas);
        return canvas;
    });

    let board = createBoard();
    let queue = [];
    let bag = [];
    let current = null;
    let holdType = null;
    let holdUsed = false;
    let score = 0;
    let lines = 0;
    let level = 1;
    let best = readScore(SCORE_KEYS.tetris) ?? 0;
    let running = false;
    let paused = false;
    let autoPaused = false;
    let over = false;
    let dropTimeout = 0;
    let resizeFrame = 0;
    let overlayHandler = null;
    let boardCtx = null;
    let boardCell = 0;
    let boardWidth = 0;
    let themeColors = { grid: '', cell: '' };

    bestEl.textContent = String(best);
    readThemeColors();

    function createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    }

    /** 网格颜色来自 CSS 变量，切换主题后重新取一次。 */
    function readThemeColors() {
        const styles = window.getComputedStyle(root);
        themeColors = {
            grid: styles.getPropertyValue('--game-grid').trim() || 'rgba(140, 165, 255, 0.16)',
            cell: styles.getPropertyValue('--game-cell').trim() || 'rgba(255, 255, 255, 0.05)',
        };
    }

    function bagNext() {
        if (!bag.length) {
            bag = Object.keys(SHAPES);
            // 洗牌后一次性发出，保证七个方块各出现一次（7-bag）
            for (let i = bag.length - 1; i > 0; i -= 1) {
                const j = Math.floor(Math.random() * (i + 1));
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
        }
        return bag.pop();
    }

    function refillQueue() {
        while (queue.length <= NEXT_COUNT) {
            queue.push(bagNext());
        }
    }

    function spawn(type = queue.shift()) {
        refillQueue();

        const matrix = SHAPES[type].map((row) => row.slice());
        const piece = {
            type,
            matrix,
            x: Math.floor((COLS - matrix[0].length) / 2),
            y: type === 'I' ? -1 : 0,
        };

        current = piece;
        if (collides(piece.matrix, piece.x, piece.y)) {
            endGame();
            return;
        }

        holdUsed = false;
        drawPreviews();
        render();
    }

    function collides(matrix, offsetX, offsetY) {
        for (let row = 0; row < matrix.length; row += 1) {
            for (let col = 0; col < matrix[row].length; col += 1) {
                if (!matrix[row][col]) continue;

                const x = offsetX + col;
                const y = offsetY + row;
                if (x < 0 || x >= COLS || y >= ROWS) return true;
                if (y >= 0 && board[y][x]) return true;
            }
        }
        return false;
    }

    function rotateMatrix(matrix, clockwise) {
        const size = matrix.length;
        const result = Array.from({ length: size }, () => Array(size).fill(0));

        for (let row = 0; row < size; row += 1) {
            for (let col = 0; col < size; col += 1) {
                if (clockwise) {
                    result[col][size - 1 - row] = matrix[row][col];
                } else {
                    result[size - 1 - col][row] = matrix[row][col];
                }
            }
        }
        return result;
    }

    function move(dx) {
        if (!canPlay()) return;
        if (collides(current.matrix, current.x + dx, current.y)) return;

        current.x += dx;
        render();
    }

    function rotate(clockwise = true) {
        if (!canPlay()) return;

        const rotated = rotateMatrix(current.matrix, clockwise);
        // 简单墙踢：原地、左右各让一到两格，最后允许向上顶一格
        const kicks = [
            [0, 0],
            [-1, 0],
            [1, 0],
            [-2, 0],
            [2, 0],
            [0, -1],
        ];

        for (const [dx, dy] of kicks) {
            if (collides(rotated, current.x + dx, current.y + dy)) continue;

            current.matrix = rotated;
            current.x += dx;
            current.y += dy;
            render();
            return;
        }
    }

    function step() {
        if (!canPlay()) return;

        if (collides(current.matrix, current.x, current.y + 1)) {
            lock();
            return;
        }

        current.y += 1;
        render();
    }

    function softDrop() {
        if (!canPlay()) return;

        if (collides(current.matrix, current.x, current.y + 1)) {
            lock();
            return;
        }

        current.y += 1;
        score += 1;
        updateStats();
        render();
        scheduleDrop();
    }

    function hardDrop() {
        if (!canPlay()) return;

        let distance = 0;
        while (!collides(current.matrix, current.x, current.y + distance + 1)) {
            distance += 1;
        }

        current.y += distance;
        score += distance * 2;
        updateStats();
        lock();
    }

    function lock() {
        for (let row = 0; row < current.matrix.length; row += 1) {
            for (let col = 0; col < current.matrix[row].length; col += 1) {
                if (!current.matrix[row][col]) continue;

                const y = current.y + row;
                if (y < 0) {
                    endGame();
                    return;
                }
                board[y][current.x + col] = current.type;
            }
        }

        clearLines();
        holdUsed = false;
        spawn();
        scheduleDrop();
    }

    function clearLines() {
        let cleared = 0;

        for (let row = ROWS - 1; row >= 0; row -= 1) {
            if (!board[row].every(Boolean)) continue;

            board.splice(row, 1);
            board.unshift(Array(COLS).fill(null));
            cleared += 1;
            row += 1;
        }

        if (!cleared) return;

        score += LINE_SCORES[cleared] * level;
        lines += cleared;
        level = Math.floor(lines / 10) + 1;
        updateStats();
    }

    function hold() {
        if (!canPlay() || holdUsed) return;

        const type = current.type;
        holdUsed = true;

        if (holdType) {
            const swap = holdType;
            holdType = type;
            spawn(swap);
        } else {
            holdType = type;
            current = null;
            spawn();
        }
        scheduleDrop();
    }

    function canPlay() {
        return running && !paused && !over && Boolean(current);
    }

    function scheduleDrop() {
        window.clearTimeout(dropTimeout);
        if (!running || paused || over) return;

        dropTimeout = window.setTimeout(() => {
            step();
            scheduleDrop();
        }, Math.max(1000 - (level - 1) * 80, 100));
    }

    function updateStats() {
        scoreEl.textContent = String(score);
        levelEl.textContent = String(level);
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

    function startGame() {
        board = createBoard();
        queue = [];
        bag = [];
        current = null;
        holdType = null;
        holdUsed = false;
        score = 0;
        lines = 0;
        level = 1;
        over = false;
        paused = false;
        autoPaused = false;
        running = true;

        pauseButton.classList.remove('is-active');
        pauseButton.textContent = '暂停';
        hideOverlay();
        updateStats();
        refillQueue();
        spawn();
        scheduleDrop();
    }

    function endGame() {
        running = false;
        over = true;
        window.clearTimeout(dropTimeout);

        const isBest = score > best;
        if (isBest) {
            writeScore(SCORE_KEYS.tetris, score);
            best = score;
            bestEl.textContent = String(best);
        }

        showOverlay(
            '游戏结束',
            isBest ? `新纪录 ${score} 分！` : `本局 ${score} 分，最高分 ${best} 分。`,
            '再来一局',
            startGame,
        );
    }

    function togglePause(manual = true) {
        if (!running || over) return;

        paused = !paused;
        autoPaused = paused ? !manual : false;
        pauseButton.classList.toggle('is-active', paused);
        pauseButton.textContent = paused ? '继续' : '暂停';

        if (paused) {
            window.clearTimeout(dropTimeout);
            showOverlay('已暂停', '点击继续，或按 P / Esc 恢复游戏。', '继续游戏', () =>
                togglePause(false),
            );
            return;
        }

        hideOverlay();
        scheduleDrop();
    }

    /** 棋盘 canvas 的内容尺寸只在布局变化时重算，绘制时直接复用缓存。 */
    function ensureBoardCanvas() {
        const rect = boardCanvas.getBoundingClientRect();
        const width = Math.max(rect.width, 1);
        const height = Math.max(rect.height, 1);
        if (boardCtx && Math.abs(width - boardWidth) < 0.5) return;

        const dpr = window.devicePixelRatio || 1;
        boardCanvas.width = Math.round(width * dpr);
        boardCanvas.height = Math.round(height * dpr);
        boardCtx = boardCanvas.getContext('2d');
        boardCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        boardWidth = width;
        boardCell = width / COLS;
    }

    function prepareCanvas(canvas) {
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(rect.width, 1);
        const height = Math.max(rect.height, 1);
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx, width, height };
    }

    function roundRect(ctx, x, y, size, radius) {
        const r = Math.min(radius, size / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + size - r, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + r);
        ctx.lineTo(x + size, y + size - r);
        ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
        ctx.lineTo(x + r, y + size);
        ctx.quadraticCurveTo(x, y + size, x, y + size - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function drawCell(ctx, x, y, size, color) {
        const gap = Math.max(size * 0.08, 1);
        roundRect(ctx, x + gap / 2, y + gap / 2, size - gap, Math.max(size * 0.18, 2));
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawPieceCells(ctx, matrix, offsetX, offsetY, cell, color) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                const boardY = offsetY + y;
                if (value && boardY >= 0) {
                    drawCell(ctx, (offsetX + x) * cell, boardY * cell, cell, color);
                }
            });
        });
    }

    function render() {
        ensureBoardCanvas();
        if (!boardCtx) return;

        const cell = boardCell;
        boardCtx.clearRect(0, 0, boardWidth, boardWidth * 2);

        for (let row = 0; row < ROWS; row += 1) {
            for (let col = 0; col < COLS; col += 1) {
                boardCtx.fillStyle = themeColors.cell;
                boardCtx.fillRect(col * cell, row * cell, cell, cell);
                boardCtx.strokeStyle = themeColors.grid;
                boardCtx.lineWidth = 1;
                boardCtx.strokeRect(col * cell + 0.5, row * cell + 0.5, cell - 1, cell - 1);
            }
        }

        board.forEach((row, y) => {
            row.forEach((type, x) => {
                if (type) drawCell(boardCtx, x * cell, y * cell, cell, COLORS[type]);
            });
        });

        if (!current) return;

        // 幽灵块：提示落点，减少「看错位置」的挫败感
        let ghostY = current.y;
        while (!collides(current.matrix, current.x, ghostY + 1)) {
            ghostY += 1;
        }
        if (ghostY !== current.y) {
            boardCtx.globalAlpha = 0.28;
            drawPieceCells(boardCtx, current.matrix, current.x, ghostY, cell, COLORS[current.type]);
            boardCtx.globalAlpha = 1;
        }

        drawPieceCells(boardCtx, current.matrix, current.x, current.y, cell, COLORS[current.type]);
    }

    function drawPreview(canvas, type) {
        const { ctx, width, height } = prepareCanvas(canvas);
        ctx.clearRect(0, 0, width, height);
        if (!type) return;

        const matrix = SHAPES[type];
        const filled = [];
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) filled.push([x, y]);
            });
        });

        const xs = filled.map(([x]) => x);
        const ys = filled.map(([, y]) => y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const shapeWidth = Math.max(...xs) - minX + 1;
        const shapeHeight = Math.max(...ys) - minY + 1;
        const cell = Math.min(width / (shapeWidth + 0.5), height / (shapeHeight + 0.5));
        const offsetX = (width - shapeWidth * cell) / 2;
        const offsetY = (height - shapeHeight * cell) / 2;

        ctx.save();
        ctx.translate(offsetX - minX * cell, offsetY - minY * cell);
        drawPieceCells(ctx, matrix, 0, 0, cell, COLORS[type]);
        ctx.restore();
    }

    function drawPreviews() {
        nextCanvases.forEach((canvas, index) => drawPreview(canvas, queue[index]));
        drawPreview(holdCanvas, holdType);
    }

    const HANDLED_KEYS = new Set([
        'ArrowLeft',
        'ArrowRight',
        'ArrowDown',
        'ArrowUp',
        ' ',
        'Shift',
        'z',
        'Z',
        'x',
        'X',
        'w',
        'W',
        'a',
        'A',
        'd',
        'D',
        's',
        'S',
        'c',
        'C',
        'p',
        'P',
        'Escape',
    ]);

    function handleKeyDown(event) {
        const key = event.key;
        if (!HANDLED_KEYS.has(key)) return;

        event.preventDefault();

        if (key === 'p' || key === 'P' || key === 'Escape') {
            togglePause(true);
            return;
        }
        if (!canPlay()) return;

        if (key === 'ArrowLeft' || key === 'a' || key === 'A') move(-1);
        else if (key === 'ArrowRight' || key === 'd' || key === 'D') move(1);
        else if (key === 'ArrowDown' || key === 's' || key === 'S') softDrop();
        else if (key === 'ArrowUp' || key === 'x' || key === 'X' || key === 'w' || key === 'W') {
            rotate(true);
        } else if (key === 'z' || key === 'Z') rotate(false);
        else if (key === ' ') hardDrop();
        else if (key === 'Shift' || key === 'c' || key === 'C') hold();
    }

    function handleResize() {
        if (resizeFrame) return;
        resizeFrame = window.requestAnimationFrame(() => {
            resizeFrame = 0;
            render();
            drawPreviews();
        });
    }

    function handleActionClick(event) {
        const button = event.target.closest('[data-action]');
        if (!button || !root.contains(button)) return;

        const action = button.dataset.action;
        if (action === 'left') move(-1);
        else if (action === 'right') move(1);
        else if (action === 'down') softDrop();
        else if (action === 'rotate') rotate(true);
        else if (action === 'drop') hardDrop();
        else if (action === 'hold') hold();
        else if (action === 'pause') togglePause(true);
    }

    function handleThemeChange() {
        readThemeColors();
        render();
    }

    overlay.addEventListener('click', (event) => {
        if (event.target !== overlayAction || typeof overlayHandler !== 'function') return;
        overlayHandler();
    });
    root.querySelector('.tetris-actions').addEventListener('click', handleActionClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    document.addEventListener('aurora:themechange', handleThemeChange);

    const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(handleResize) : null;
    if (resizeObserver) resizeObserver.observe(root);

    refillQueue();
    updateStats();
    render();
    drawPreviews();
    // 初始遮罩就是「开始游戏」入口，否则玩家没有触发第一局的按钮
    showOverlay(
        '俄罗斯方块',
        '方向键移动，↑ 或 X 旋转，空格直接落底。',
        '开始游戏',
        startGame,
    );

    return {
        destroy() {
            window.clearTimeout(dropTimeout);
            window.cancelAnimationFrame(resizeFrame);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('aurora:themechange', handleThemeChange);
            if (resizeObserver) resizeObserver.disconnect();
            running = false;
            root.innerHTML = '';
        },
        /** 标签页隐藏时自动暂停；手动暂停不会因为切回来而被恢复。 */
        pause() {
            if (running && !paused && !over) togglePause(false);
        },
        resume() {
            if (paused && autoPaused) togglePause(false);
        },
    };
}

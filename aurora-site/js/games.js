/** 游戏大厅入口：只做装配，具体玩法交给 js/games/ 下的各模块。 */

import { initScrollEffects } from './reveal.js';
import { safely } from './startup.js';
import { initStars } from './stars.js';
import { ThemeManager } from './theme.js';

/** 标签与游戏模块一一对应，首次激活时才加载，避免首页之外的三个游戏一次性下载。 */
const GAME_LOADERS = {
    tetris: () => import('./games/tetris.js').then((module) => module.mountTetrisGame),
    minesweeper: () => import('./games/minesweeper.js').then((module) => module.mountMinesweeperGame),
    game2048: () => import('./games/game2048.js').then((module) => module.mountGame2048),
};

const tabs = Array.from(document.querySelectorAll('.games-tab'));
const panels = Array.from(document.querySelectorAll('.game-panel'));

let activeKey = null;
let activeInstance = null;
let loadToken = 0;

function panelFor(key) {
    return panels.find((panel) => panel.dataset.game === key) ?? null;
}

/** 切走时销毁上一个游戏：模块内部会清掉自己的计时器与事件监听。 */
function destroyActive() {
    if (activeInstance && typeof activeInstance.destroy === 'function') {
        activeInstance.destroy();
    }
    activeInstance = null;
    activeKey = null;
}

async function activate(key) {
    if (!GAME_LOADERS[key] || key === activeKey) return;

    const panel = panelFor(key);
    if (!panel) return;

    // 标签栏自己也要用左右方向键切换，而方向键同时是游戏操作；
    // 因此只要焦点还在标签栏里，激活后就把焦点交给游戏面板。
    const focusPanel = document.activeElement instanceof Element
        && document.activeElement.closest('.games-tabs') !== null;

    destroyActive();
    activeKey = key;

    tabs.forEach((tab) => {
        const isActive = tab.dataset.game === key;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((item) => {
        const isActive = item === panel;
        item.classList.toggle('is-active', isActive);
        if (isActive) item.removeAttribute('hidden');
        else item.setAttribute('hidden', '');
    });

    const mountPoint = panel.querySelector('[data-game-mount]');
    if (!mountPoint) return;

    const token = (loadToken += 1);
    const mount = await GAME_LOADERS[key]();
    // 加载期间用户可能已经切到另一个游戏，过期的挂载直接丢弃
    if (token !== loadToken || activeKey !== key) return;

    activeInstance = mount(mountPoint);
    if (focusPanel) panel.focus({ preventScroll: true });
}

function handleTabClick(event) {
    const tab = event.target.closest('.games-tab');
    if (!tab || !tab.dataset.game) return;

    activate(tab.dataset.game);
}

/** 标签栏支持左右方向键切换，符合 tablist 的常规键盘习惯。 */
function handleTabKeyDown(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex < 0) return;

    event.preventDefault();
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const nextTab = tabs[(currentIndex + offset + tabs.length) % tabs.length];
    nextTab.focus();
    activate(nextTab.dataset.game);
}

function handleVisibilityChange() {
    if (!activeInstance) return;

    if (document.hidden) activeInstance.pause?.();
    else activeInstance.resume?.();
}

function bootstrap() {
    safely('主题', () => new ThemeManager());
    safely('星空', initStars);
    safely('滚动效果', initScrollEffects);

    const tabList = document.querySelector('.games-tabs');
    if (tabList) {
        tabList.addEventListener('click', handleTabClick);
        tabList.addEventListener('keydown', handleTabKeyDown);
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    safely('游戏列表', () => {
        const initial = tabs.find((tab) => tab.classList.contains('is-active')) ?? tabs[0];
        if (initial) activate(initial.dataset.game);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

/** 滚动效果：元素进场动画（淡入上浮 + 同层错峰）与顶部阅读进度条。 */

/** 参与进场动画的元素；左侧 sticky 名片刻意不包含在内。 */
const TARGET_SELECTOR = [
    // 首页
    '.section-title',
    '.about-content p',
    '.skill-tag',
    '.project-card',
    '.message-form',
    '.message-card',
    '.action-btn',
    '.updates-content p',
    // 游戏大厅
    '.games-head',
    '.games-tabs',
    // 简历页
    '.resume-head',
    '.resume-section h2',
    '.resume-item',
    // 项目详情页
    '.detail-header',
    '.metric-card',
    '.detail-section',
    '.detail-actions',
].join(', ');

const STAGGER_MS = 70;
const MAX_STAGGER_STEPS = 5;
const REVEAL_THRESHOLD = 0.15;
const REVEAL_ROOT_MARGIN = '0px 0px -8% 0px';
const CLEANUP_DELAY_MS = 1400;

let observer = null;
let progressBar = null;
let progressFill = null;
let scrollFrame = 0;
let mutationFrame = 0;
let initialized = false;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initScrollEffects() {
    if (initialized) return;
    initialized = true;

    initProgressBar();

    // 减少动效时内容直接可见，只保留进度条
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
        document.documentElement.classList.remove('reveal-ready');
        return;
    }

    initReveal();
}

function initReveal() {
    observer = new IntersectionObserver(handleIntersect, {
        threshold: REVEAL_THRESHOLD,
        rootMargin: REVEAL_ROOT_MARGIN,
    });

    registerTargets();

    // 项目卡片与详情页正文是异步渲染的，渲染完成后自动接管
    const mutationObserver = new MutationObserver((mutations) => {
        const hasNewNodes = mutations.some(
            (mutation) => mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0,
        );
        if (!hasNewNodes || mutationFrame) return;

        mutationFrame = requestAnimationFrame(() => {
            mutationFrame = 0;
            registerTargets();
        });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
}

function registerTargets() {
    document.querySelectorAll(TARGET_SELECTOR).forEach((element) => {
        if (element.dataset.revealBound === '1') return;

        element.dataset.revealBound = '1';
        element.classList.add('reveal-target');
        element.style.setProperty('--reveal-delay', `${getStaggerDelay(element)}ms`);
        observer.observe(element);
    });
}

/** 同父容器内按次序错峰，最多叠加 MAX_STAGGER_STEPS 档，避免长列表越等越久。 */
function getStaggerDelay(element) {
    const parent = element.parentElement;
    if (!parent) return 0;

    const siblings = Array.from(parent.children).filter((child) => child.matches(TARGET_SELECTOR));
    const index = siblings.indexOf(element);
    return Math.min(index < 0 ? 0 : index, MAX_STAGGER_STEPS) * STAGGER_MS;
}

function handleIntersect(entries) {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const element = entry.target;
        observer.unobserve(element);
        element.classList.add('is-visible');

        // 动画结束后摘掉动画类，避免过渡属性影响卡片自身的 hover 动效
        const cleanup = () => {
            element.classList.remove('reveal-target', 'is-visible');
            element.style.removeProperty('--reveal-delay');
        };
        element.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, CLEANUP_DELAY_MS);
    });
}

function initProgressBar() {
    if (progressBar) return;

    progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress';
    progressBar.setAttribute('aria-hidden', 'true');

    progressFill = document.createElement('span');
    progressBar.appendChild(progressFill);
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', scheduleProgressUpdate, { passive: true });
    window.addEventListener('resize', scheduleProgressUpdate, { passive: true });
    updateProgress();
}

function scheduleProgressUpdate() {
    if (scrollFrame) return;

    scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        updateProgress();
    });
}

function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 4 ? Math.min(Math.max(window.scrollY / scrollable, 0), 1) : 0;

    progressFill.style.width = `${(ratio * 100).toFixed(2)}%`;
    progressBar.classList.toggle('is-idle', scrollable <= 4);
}

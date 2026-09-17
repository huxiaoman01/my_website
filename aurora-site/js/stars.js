/** 星空与流星：分层星星（带视差漂移）、定时流星与「小惊喜」流星雨。 */

import { spawnAmbientBubble } from './bubbles.js';

const SHOOTING_STAR_INTERVAL_MS = 3000;
const METEOR_SHOWER_COUNT = 26;
const METEOR_SHOWER_SPREAD_MS = 1100;

/** 三层星星：越"近"的越大越亮、漂移越明显，形成视差纵深感。 */
const STAR_LAYERS = [
    {
        className: 'star--far',
        count: 88,
        size: [1, 1.7],
        minOpacity: [0.18, 0.4],
        twinkle: [3.5, 7],
        drift: [70, 120],
        driftRange: 16,
    },
    {
        className: 'star--mid',
        count: 42,
        size: [1.6, 2.5],
        minOpacity: [0.3, 0.55],
        twinkle: [2.6, 5],
        drift: [50, 80],
        driftRange: 24,
    },
    {
        className: 'star--near',
        count: 16,
        size: [2.4, 3.6],
        minOpacity: [0.45, 0.7],
        twinkle: [2, 3.6],
        drift: [36, 60],
        driftRange: 34,
    },
];

/** 带十字星芒的亮星数量。 */
const BRIGHT_STAR_COUNT = 6;

const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let container = null;

const randomBetween = (min, max) => Math.random() * (max - min) + min;

/** 用户偏好减少动效时为 true：星星静态化并关闭流星。 */
export function prefersReducedMotion() {
    return reduceMotionQuery.matches;
}

export function initStars(containerId = 'stars-container') {
    container = document.getElementById(containerId);
    if (!container) return;

    STAR_LAYERS.forEach(createStarLayer);
    createBrightStars();
    setupParallax();

    if (!prefersReducedMotion()) {
        setInterval(() => {
            // 亮色主题是"白天"，飘泡泡而不是下流星
            if (document.body.classList.contains('light-theme')) {
                if (Math.random() < 0.6) {
                    spawnAmbientBubble();
                }
                return;
            }
            createShootingStar(false);
        }, SHOOTING_STAR_INTERVAL_MS);
    }
}

/** 星空跟随光标做轻微视差移动，让静止的夜空有纵深感。 */
function setupParallax() {
    if (prefersReducedMotion() || !container) return;

    let pending = 0;

    window.addEventListener('pointermove', (event) => {
        if (pending) return;

        pending = requestAnimationFrame(() => {
            pending = 0;
            const offsetX = (event.clientX / window.innerWidth - 0.5) * -36;
            const offsetY = (event.clientY / window.innerHeight - 0.5) * -24;
            container.style.transform = `translate3d(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px, 0)`;
        });
    });
}

function createStarLayer(layer) {
    for (let i = 0; i < layer.count; i++) {
        createStar({
            className: layer.className,
            size: randomBetween(...layer.size),
            minOpacity: randomBetween(...layer.minOpacity),
            twinkle: randomBetween(...layer.twinkle),
            drift: randomBetween(...layer.drift),
            driftRange: layer.driftRange,
        });
    }
}

function createBrightStars() {
    for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
        createStar({
            className: 'star--near star--bright',
            size: randomBetween(2.6, 3.8),
            minOpacity: randomBetween(0.55, 0.8),
            twinkle: randomBetween(3, 5),
            drift: randomBetween(40, 70),
            driftRange: 26,
        });
    }
}

function createStar({ className, size, minOpacity, twinkle, drift, driftRange }) {
    const star = document.createElement('div');
    star.className = `star ${className}`;

    star.style.width = `${size.toFixed(2)}px`;
    star.style.height = `${size.toFixed(2)}px`;
    star.style.left = `${randomBetween(0, 100).toFixed(2)}vw`;
    star.style.top = `${randomBetween(0, 100).toFixed(2)}vh`;

    star.style.setProperty('--star-min-opacity', minOpacity.toFixed(2));
    star.style.setProperty('--star-max-opacity', randomBetween(0.8, 1).toFixed(2));
    star.style.setProperty('--twinkle-duration', `${twinkle.toFixed(2)}s`);
    star.style.setProperty('--drift-duration', `${drift.toFixed(1)}s`);
    star.style.setProperty('--drift-x', `${randomBetween(-driftRange, driftRange).toFixed(1)}px`);
    star.style.setProperty('--drift-y', `${randomBetween(-driftRange * 0.7, driftRange * 0.5).toFixed(1)}px`);

    // 负延迟让每颗星从动画中途开始，避免整片星空整齐划一地闪
    star.style.animationDelay = `-${randomBetween(0, 10).toFixed(1)}s`;

    if (prefersReducedMotion()) {
        star.style.animation = 'none';
        star.style.opacity = minOpacity.toFixed(2);
    }

    container.appendChild(star);
}

/** 创建流星；force 为 true 时必定生成（用于按钮流星雨），options 可覆盖起点、长度与时长。 */
export function createShootingStar(force = false, options = {}) {
    if (!container || prefersReducedMotion()) return;
    if (!force && Math.random() > 0.2) return;

    const length = options.length ?? Math.random() * 180 + 120;
    const duration = options.duration ?? Math.random() * 0.6 + 1.1;

    const shootingStar = document.createElement('div');
    shootingStar.classList.add('shooting-star');

    // 随机位置
    shootingStar.style.left = `${options.left ?? Math.random() * 100}vw`;
    shootingStar.style.top = `${options.top ?? Math.random() * 30}vh`;
    shootingStar.style.width = `${length}px`;
    shootingStar.style.animationDuration = `${duration}s`;

    container.appendChild(shootingStar);

    // 动画结束后移除元素，避免 DOM 持续增长
    setTimeout(() => {
        shootingStar.remove();
    }, duration * 1000 + 200);
}

/** 「小惊喜」按钮：短时间内密集发射流星，形成明显的流星雨。 */
export function triggerMeteorShower() {
    if (prefersReducedMotion()) return;

    for (let i = 0; i < METEOR_SHOWER_COUNT; i++) {
        const delay = Math.random() * METEOR_SHOWER_SPREAD_MS;
        setTimeout(() => {
            createShootingStar(true, {
                left: Math.random() * 90 - 10,
                top: Math.random() * 45 - 5,
                length: Math.random() * 220 + 140,
                duration: Math.random() * 0.5 + 1,
            });
        }, delay);
    }
}

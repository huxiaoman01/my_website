/** 星空与流星：生成星星、定时流星、主题联动与「小惊喜」流星雨。 */

const STAR_COUNT = 150;
const SHOOTING_STAR_INTERVAL_MS = 3000;
const SHOOTING_STAR_LIFETIME_MS = 2000;
const METEOR_SHOWER_COUNT = 10;
const METEOR_SHOWER_GAP_MS = 200;

const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let container = null;
const stars = [];

/** 用户偏好减少动效时为 true，用于关闭流星与星星闪烁。 */
export function prefersReducedMotion() {
    return reduceMotionQuery.matches;
}

export function initStars(containerId = 'stars-container') {
    container = document.getElementById(containerId);
    if (!container) return;

    createStars();

    if (!prefersReducedMotion()) {
        setInterval(() => createShootingStar(false), SHOOTING_STAR_INTERVAL_MS);
    }
}

function createStars() {
    for (let i = 0; i < STAR_COUNT; i++) {
        const star = document.createElement('div');
        star.classList.add('star');

        // 随机大小
        const size = Math.random() * 3 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;

        // 随机位置
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 100}vh`;

        // 随机亮度
        star.style.opacity = (Math.random() * 0.7 + 0.3).toString();

        if (prefersReducedMotion()) {
            star.style.animation = 'none';
        } else {
            // 随机动画时长与延迟
            star.style.animationDuration = `${Math.random() * 5 + 3}s`;
            star.style.animationDelay = `${Math.random() * 5}s`;
        }

        container.appendChild(star);
        stars.push(star);
    }
}

/** 创建流星；force 为 true 时必定生成（用于按钮流星雨）。 */
export function createShootingStar(force = false) {
    if (!container || prefersReducedMotion()) return;
    if (!force && Math.random() > 0.2) return;

    const shootingStar = document.createElement('div');
    shootingStar.classList.add('shooting-star');

    // 随机位置
    shootingStar.style.left = `${Math.random() * 100}vw`;
    shootingStar.style.top = `${Math.random() * 30}vh`;

    // 随机长度
    shootingStar.style.width = `${Math.random() * 150 + 100}px`;

    container.appendChild(shootingStar);

    // 动画结束后移除元素，避免 DOM 持续增长
    setTimeout(() => {
        if (shootingStar.parentNode) {
            shootingStar.parentNode.removeChild(shootingStar);
        }
    }, SHOOTING_STAR_LIFETIME_MS);
}

/** 「小惊喜」按钮：连续发射若干流星。 */
export function triggerMeteorShower() {
    for (let i = 0; i < METEOR_SHOWER_COUNT; i++) {
        setTimeout(() => createShootingStar(true), i * METEOR_SHOWER_GAP_MS);
    }
}

/** 主题切换时同步星星与流星的亮度（亮色主题更淡）。 */
export function applyStarTheme(theme) {
    const isLight = theme === 'light';

    stars.forEach((star) => {
        star.style.opacity = isLight ? '0.3' : '0.8';
        star.style.boxShadow = isLight
            ? '0 0 4px rgba(49, 130, 206, 0.3)'
            : '0 0 6px rgba(255, 255, 255, 0.5)';
    });

    if (container) {
        container.querySelectorAll('.shooting-star').forEach((shootingStar) => {
            shootingStar.style.opacity = isLight ? '0.4' : '0.8';
        });
    }
}

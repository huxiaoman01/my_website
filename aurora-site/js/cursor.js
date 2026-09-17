/** 光标粒子拖尾：暗色主题洒出会发光的星尘，亮色主题飘落花瓣。 */

const MIN_DISTANCE_PX = 16;
const MIN_INTERVAL_MS = 28;
const MAX_LIVE_PARTICLES = 70;

const randomBetween = (min, max) => Math.random() * (max - min) + min;

let layer = null;
let liveParticles = [];
let lastX = null;
let lastY = null;
let lastSpawnAt = 0;

export function initCursorParticles() {
    // 触屏设备没有指针悬停，减少动效时也不生成粒子
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    layer = document.getElementById('fx-layer');
    if (!layer) return;

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
}

function handlePointerMove(event) {
    const now = performance.now();

    if (lastX !== null) {
        const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
        if (distance < MIN_DISTANCE_PX) return;
    }
    if (now - lastSpawnAt < MIN_INTERVAL_MS) return;

    lastX = event.clientX;
    lastY = event.clientY;
    lastSpawnAt = now;

    spawnParticle(event.clientX, event.clientY);
}

function spawnParticle(x, y) {
    const isLight = document.body.classList.contains('light-theme');
    const particle = document.createElement('span');
    particle.className = `cursor-particle cursor-particle--${isLight ? 'petal' : 'star'}`;

    const size = isLight ? randomBetween(5, 9) : randomBetween(2.5, 5.5);
    const life = isLight ? randomBetween(1300, 2100) : randomBetween(700, 1200);

    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = `${size.toFixed(1)}px`;
    particle.style.height = `${(isLight ? size * 0.72 : size).toFixed(1)}px`;
    particle.style.setProperty('--drift-x', `${randomBetween(-26, 26).toFixed(1)}px`);
    // 星尘四散，花瓣向下飘落
    particle.style.setProperty(
        '--drift-y',
        `${(isLight ? randomBetween(12, 40) : randomBetween(-20, 20)).toFixed(1)}px`,
    );
    particle.style.setProperty('--rotate', `${randomBetween(-220, 220).toFixed(0)}deg`);
    particle.style.animationDuration = `${life.toFixed(0)}ms`;

    layer.appendChild(particle);
    liveParticles.push(particle);

    // 限制同时存在的粒子数，避免长时间移动后 DOM 膨胀
    if (liveParticles.length > MAX_LIVE_PARTICLES) {
        liveParticles.shift().remove();
    }

    particle.addEventListener('animationend', () => {
        particle.remove();
        liveParticles = liveParticles.filter((item) => item !== particle);
    });
}

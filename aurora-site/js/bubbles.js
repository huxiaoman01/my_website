/** 亮色主题的「小惊喜」：泡泡。暗色主题用的是 stars.js 里的流星雨。 */

const BURST_COUNT = 18;
const BURST_SPREAD_MS = 900;

const randomBetween = (min, max) => Math.random() * (max - min) + min;

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getLayer() {
    return document.getElementById('fx-layer');
}

/** 按钮触发的泡泡雨：从页面底部成片升起。 */
export function triggerBubbleBurst() {
    if (prefersReducedMotion()) return;

    const layer = getLayer();
    if (!layer) return;

    for (let i = 0; i < BURST_COUNT; i++) {
        setTimeout(() => {
            createBubble(layer, {
                left: window.innerWidth * randomBetween(0.12, 0.88),
                top: window.innerHeight - randomBetween(0, 70),
                size: randomBetween(12, 34),
                rise: window.innerHeight * randomBetween(0.35, 0.75),
                drift: randomBetween(-60, 60),
                life: randomBetween(2800, 4600),
            });
        }, Math.random() * BURST_SPREAD_MS);
    }
}

/** 亮色主题下的常驻效果：偶尔从底部冒一个小泡泡。 */
export function spawnAmbientBubble() {
    if (prefersReducedMotion()) return;

    const layer = getLayer();
    if (!layer) return;

    createBubble(layer, {
        left: window.innerWidth * randomBetween(0.05, 0.95),
        top: window.innerHeight + randomBetween(0, 40),
        size: randomBetween(8, 20),
        rise: window.innerHeight * randomBetween(0.5, 0.9),
        drift: randomBetween(-40, 40),
        life: randomBetween(5000, 8000),
    });
}

function createBubble(layer, { left, top, size, rise, drift, life }) {
    const bubble = document.createElement('span');
    bubble.className = 'bubble';
    bubble.style.left = `${left.toFixed(1)}px`;
    bubble.style.top = `${top.toFixed(1)}px`;
    bubble.style.width = `${size.toFixed(1)}px`;
    bubble.style.height = `${size.toFixed(1)}px`;
    bubble.style.setProperty('--rise', `${(-rise).toFixed(1)}px`);
    bubble.style.setProperty('--drift-x', `${drift.toFixed(1)}px`);
    bubble.style.animationDuration = `${life.toFixed(0)}ms`;

    layer.appendChild(bubble);
    bubble.addEventListener('animationend', () => bubble.remove());
}

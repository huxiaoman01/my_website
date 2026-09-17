/** 页面交互：打字机、微信弹层、技能标签悬停、按钮反馈与流星雨按钮。 */

import { triggerBubbleBurst } from './bubbles.js';
import { prefersReducedMotion, triggerMeteorShower } from './stars.js';

const SURPRISE_TEXT = { dark: '流星雨发射！', light: '泡泡升空！' };

/** 昵称逐字输出。 */
export function typeWriterEffect(elementId = 'typewriter', speed = 150) {
    const nicknameElement = document.getElementById(elementId);
    if (!nicknameElement) return;

    const text = nicknameElement.textContent;
    nicknameElement.textContent = '';

    if (prefersReducedMotion()) {
        nicknameElement.textContent = text;
        return;
    }

    let index = 0;

    function typeWriter() {
        if (index < text.length) {
            nicknameElement.textContent += text.charAt(index);
            index += 1;
            setTimeout(typeWriter, speed);
        }
    }

    // 延迟开始打字效果
    setTimeout(typeWriter, 500);
}

/** 微信二维码弹层：点击按钮打开，点击关闭按钮或遮罩关闭。 */
export function setupWechatModal(buttonId = 'wechat-btn', modalId = 'wechat-modal') {
    const wechatBtn = document.getElementById(buttonId);
    const wechatModal = document.getElementById(modalId);
    if (!wechatBtn || !wechatModal) return;

    const closeModal = wechatModal.querySelector('.close-modal');

    wechatBtn.addEventListener('click', (event) => {
        event.preventDefault();
        wechatModal.style.display = 'flex';
    });

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            wechatModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === wechatModal) {
            wechatModal.style.display = 'none';
        }
    });
}

/**
 * 「小惊喜」按钮：暗色主题下发射流星雨，亮色主题下升起泡泡。
 * 高亮态交给 CSS 的 .is-active 处理，避免写死颜色在亮色主题下变成黑底黑字。
 */
export function setupMeteorButton(buttonId = 'meteor-btn') {
    const button = document.getElementById(buttonId);
    if (!button) return;

    const currentTheme = () => (document.body.classList.contains('light-theme') ? 'light' : 'dark');

    const render = (text) => {
        const theme = currentTheme();
        // 亮色主题用纯 CSS 画的气泡图标，避免依赖免费版 Font Awesome 里没有的图标
        const icon = theme === 'light'
            ? '<i class="fx-bubble-icon" aria-hidden="true"></i>'
            : '<i class="fas fa-meteor"></i>';
        button.innerHTML = `${icon}<span>${text}</span>`;
    };

    render('小惊喜');
    document.addEventListener('aurora:themechange', () => {
        if (!button.classList.contains('is-active')) {
            render('小惊喜');
        }
    });

    button.addEventListener('click', () => {
        const theme = currentTheme();

        if (!prefersReducedMotion()) {
            if (theme === 'light') {
                triggerBubbleBurst();
            } else {
                triggerMeteorShower();
            }
        }

        button.classList.add('is-active');
        render(SURPRISE_TEXT[theme]);

        setTimeout(() => {
            button.classList.remove('is-active');
            render('小惊喜');
        }, 2200);
    });
}

/** 技能标签悬停微交互。 */
export function addSkillHoverEffects() {
    document.querySelectorAll('.skill-tag').forEach((tag) => {
        tag.addEventListener('mouseenter', () => {
            tag.style.transform = 'translateY(-2px) scale(1.05)';
        });

        tag.addEventListener('mouseleave', () => {
            tag.style.transform = 'translateY(0) scale(1)';
        });
    });
}

/** 按钮按压反馈 + 区块内平滑滚动。 */
export function addButtonInteractions() {
    document.querySelectorAll('.action-btn').forEach((button) => {
        button.addEventListener('mousedown', () => {
            button.style.transform = 'translateY(-2px) scale(0.98)';
        });

        button.addEventListener('mouseup', () => {
            button.style.transform = 'translateY(-5px) scale(1)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
        });
    });

    scrollIntoViewOnClick('.projects-btn', 'projects');
    scrollIntoViewOnClick('.contact-btn', 'guestbook');
}

function scrollIntoViewOnClick(buttonSelector, sectionId) {
    const button = document.querySelector(buttonSelector);
    const section = document.getElementById(sectionId);
    if (!button || !section || button.tagName !== 'A') return;

    button.addEventListener('click', (event) => {
        event.preventDefault();
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

/** 回到顶部等页内锚点。 */
export function setupAnchorScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        const targetId = anchor.getAttribute('href').slice(1);
        if (!targetId) return;

        const target = document.getElementById(targetId);
        if (!target) return;

        anchor.addEventListener('click', (event) => {
            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

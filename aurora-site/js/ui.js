/** 页面交互：打字机、微信弹层、技能标签悬停、按钮反馈与流星雨按钮。 */

import { prefersReducedMotion, triggerMeteorShower } from './stars.js';

/** 昵称逐字输出，完成后接一个闪烁光标。 */
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
        } else {
            addCursorBlink(nicknameElement);
        }
    }

    // 延迟开始打字效果
    setTimeout(typeWriter, 500);
}

function addCursorBlink(nicknameElement) {
    const cursor = document.createElement('span');
    cursor.classList.add('cursor');
    cursor.textContent = '|';

    if (!prefersReducedMotion()) {
        cursor.style.animation = 'blink 1s infinite';
        ensureBlinkKeyframes();
    }

    nicknameElement.appendChild(cursor);
}

function ensureBlinkKeyframes() {
    if (document.getElementById('cursor-blink-keyframes')) return;

    const style = document.createElement('style');
    style.id = 'cursor-blink-keyframes';
    style.textContent = `
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
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

/** 「小惊喜」按钮：发射流星雨并给出按钮反馈。 */
export function setupMeteorButton(buttonId = 'meteor-btn') {
    const meteorBtn = document.getElementById(buttonId);
    if (!meteorBtn) return;

    meteorBtn.addEventListener('click', () => {
        triggerMeteorShower();

        meteorBtn.innerHTML = '<i class="fas fa-meteor"></i><span>流星雨发射！</span>';
        meteorBtn.style.background = 'linear-gradient(135deg, #9d4edd, #4a6fa5)';

        setTimeout(() => {
            meteorBtn.innerHTML = '<i class="fas fa-meteor"></i><span>小惊喜</span>';
            meteorBtn.style.background = 'linear-gradient(135deg, #0a0a0f, #2a2a3a)';
        }, 2000);
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

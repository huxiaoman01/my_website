/** 页面入口：装配星空、主题、项目列表、留言板与各类交互。 */

import { setupGuestbook } from './guestbook.js';
import { initCursorParticles } from './cursor.js';
import { loadProjectsFromApi } from './projects.js';
import { initScrollEffects } from './reveal.js';
import { initStars } from './stars.js';
import { ThemeManager } from './theme.js';
import {
    addButtonInteractions,
    addSkillHoverEffects,
    setupAnchorScrolling,
    setupMeteorButton,
    setupWechatModal,
    typeWriterEffect,
} from './ui.js';

function bootstrap() {
    // 先确定主题，后面的模块（如「小惊喜」按钮的图标与文案）才能据此初始化
    new ThemeManager();

    initStars();
    initCursorParticles();
    initScrollEffects();
    typeWriterEffect();
    setupWechatModal();
    setupMeteorButton();
    addSkillHoverEffects();
    addButtonInteractions();
    setupAnchorScrolling();

    loadProjectsFromApi();
    setupGuestbook();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

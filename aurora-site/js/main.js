/** 页面入口：装配星空、主题、项目列表、留言板与各类交互。 */

import { setupGuestbook } from './guestbook.js';
import { loadProjectsFromApi } from './projects.js';
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
    initStars();
    typeWriterEffect();
    setupWechatModal();
    setupMeteorButton();
    addSkillHoverEffects();
    addButtonInteractions();
    setupAnchorScrolling();

    // 主题管理器依赖星星元素，放在 initStars 之后初始化
    new ThemeManager();

    loadProjectsFromApi();
    setupGuestbook();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

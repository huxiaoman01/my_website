/** 页面入口：装配星空、主题、项目列表、留言板与各类交互。 */

import { setupGuestbook } from './guestbook.js';
import { initCursorParticles } from './cursor.js';
import { loadProjectsFromApi } from './projects.js';
import { initScrollEffects } from './reveal.js';
import { safely } from './startup.js';
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
    safely('主题', () => new ThemeManager());

    safely('星空', initStars);
    safely('光标粒子', initCursorParticles);
    safely('滚动效果', initScrollEffects);
    safely('打字机', typeWriterEffect);
    safely('微信弹层', setupWechatModal);
    safely('小惊喜按钮', setupMeteorButton);
    safely('技能标签', addSkillHoverEffects);
    safely('按钮交互', addButtonInteractions);
    safely('锚点滚动', setupAnchorScrolling);

    safely('项目列表', loadProjectsFromApi);
    safely('留言板', setupGuestbook);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

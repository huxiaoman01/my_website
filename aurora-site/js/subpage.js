/** 子页面入口（项目详情 / 在线简历）：只初始化主题与星空，不加载粒子、流星雨与留言板。 */

import { initScrollEffects } from './reveal.js';
import { initStars } from './stars.js';
import { ThemeManager } from './theme.js';

function bootstrap() {
    new ThemeManager();
    initStars();
    initScrollEffects();

    // 项目详情页才需要渲染详情，其它子页面不进这个分支
    if (document.getElementById('project-detail')) {
        import('./project-detail.js').then((module) => module.renderProjectDetail());
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

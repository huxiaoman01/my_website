/** 子页面入口（项目详情 / 在线简历）：只初始化主题与星空，不加载粒子、流星雨与留言板。 */

import { initScrollEffects } from './reveal.js';
import { safely } from './startup.js';
import { initStars } from './stars.js';
import { ThemeManager } from './theme.js';

function bootstrap() {
    safely('主题', () => new ThemeManager());
    safely('星空', initStars);
    safely('滚动效果', initScrollEffects);

    // 项目详情页才需要渲染详情，其它子页面不进这个分支
    if (document.getElementById('project-detail')) {
        import('./project-detail.js')
            .then((module) => module.renderProjectDetail())
            .catch((err) => console.error('详情页初始化失败:', err));
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

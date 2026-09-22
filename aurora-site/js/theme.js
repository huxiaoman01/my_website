/**
 * 主题切换：localStorage 持久化偏好（不可用时降级为本次会话内生效），
 * 未手动选择时跟随系统主题。所有外部 API 都做了兜底，避免个别浏览器
 * （隐私模式禁用存储、老 WebKit 不支持 MediaQueryList.addEventListener）
 * 抛错后把整个页面的初始化打断。
 */

const STORAGE_KEY = 'theme';

/** 读取偏好；存储被禁用时返回 null，不影响切换。 */
function readStoredTheme() {
    try {
        return window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
        return null;
    }
}

/** 写入偏好；存储被禁用时静默忽略，本次会话内仍然生效。 */
function writeStoredTheme(theme) {
    try {
        window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
        /* 隐私模式或被禁用时忽略 */
    }
}

export class ThemeManager {
    constructor(toggleId = 'theme-toggle') {
        this.themeToggle = document.getElementById(toggleId);
        this.moonIcon = this.themeToggle ? this.themeToggle.querySelector('.fa-moon') : null;
        this.sunIcon = this.themeToggle ? this.themeToggle.querySelector('.fa-sun') : null;
        this.current = 'dark';
        this.init();
    }

    init() {
        // 先绑定点击：后面任何一步在旧浏览器上失败都不会让开关失效
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
            this.themeToggle.setAttribute('role', 'button');
            this.themeToggle.setAttribute('tabindex', '0');
            this.themeToggle.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.toggleTheme();
                }
            });
        }

        // 首次访问沿用深色主题，只有手动切换才写入偏好
        this.applyTheme(readStoredTheme() === 'light' ? 'light' : 'dark', false);

        this.watchSystemTheme();
    }

    applyTheme(theme, persist = true) {
        const isLight = theme === 'light';

        this.current = isLight ? 'light' : 'dark';
        // 同时标记 <html> 与 <body>：<html> 上的类由首帧前的内联脚本设置，负责避免闪烁
        document.documentElement.classList.toggle('light-theme', isLight);
        document.body.classList.toggle('light-theme', isLight);

        if (this.moonIcon) {
            this.moonIcon.style.display = isLight ? 'none' : 'block';
        }
        if (this.sunIcon) {
            this.sunIcon.style.display = isLight ? 'block' : 'none';
        }

        if (persist) {
            writeStoredTheme(this.current);
        }

        // 通知其它模块（例如「小惊喜」按钮）主题已变化
        document.dispatchEvent(
            new CustomEvent('aurora:themechange', { detail: { theme: this.current } }),
        );
    }

    toggleTheme() {
        this.applyTheme(this.current === 'light' ? 'dark' : 'light');
    }

    watchSystemTheme() {
        if (!window.matchMedia) return;

        try {
            const query = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (event) => {
                // 用户手动选过主题就不再跟随系统
                if (readStoredTheme()) return;
                this.applyTheme(event.matches ? 'dark' : 'light', false);
            };

            if (typeof query.addEventListener === 'function') {
                query.addEventListener('change', handler);
            } else if (typeof query.addListener === 'function') {
                // 老版 Safari / WebKit 只支持 addListener
                query.addListener(handler);
            }
        } catch (err) {
            /* 无法监听系统主题时忽略，不影响手动切换 */
        }
    }
}

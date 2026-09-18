/** 主题切换：localStorage 持久化偏好，未手动选择时跟随系统主题。 */

const STORAGE_KEY = 'theme';

export class ThemeManager {
    constructor(toggleId = 'theme-toggle') {
        this.themeToggle = document.getElementById(toggleId);
        if (!this.themeToggle) return;

        this.moonIcon = this.themeToggle.querySelector('.fa-moon');
        this.sunIcon = this.themeToggle.querySelector('.fa-sun');
        this.current = 'dark';
        this.init();
    }

    init() {
        // 首次访问沿用深色主题，只有手动切换才写入偏好
        this.applyTheme(this.getStoredTheme() === 'light' ? 'light' : 'dark', false);

        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.watchSystemTheme();
    }

    getStoredTheme() {
        return localStorage.getItem(STORAGE_KEY);
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
            localStorage.setItem(STORAGE_KEY, this.current);
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

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
            // 用户手动选过主题就不再跟随系统
            if (this.getStoredTheme()) return;
            this.applyTheme(event.matches ? 'dark' : 'light', false);
        });
    }
}

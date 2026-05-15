// 本地开发：与 api/main.py 中 CORS 一致（前端建议用 python -m http.server 5500）
const API_BASE = 'http://127.0.0.1:8000';

// 等待DOM完全加载
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. 创建星空背景
    createStars();
    
    // 2. 打字机效果
    typeWriterEffect();
    
    // 3. 微信二维码模态框
    setupWechatModal();
    
    // 4. 流星雨效果按钮
    setupMeteorButton();
    
    // 5. 添加技能标签悬停效果
    addSkillHoverEffects();
    
    // 6. 添加按钮交互效果
    addButtonInteractions();

    // 7. 从 FastAPI 加载项目列表并渲染
    loadProjectsFromApi();
});

// 创建星空背景
function createStars() {
    const starsContainer = document.getElementById('stars-container');
    const starCount = 150; // 星星数量
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // 随机大小
        const size = Math.random() * 3 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // 随机位置
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 100}vh`;
        
        // 随机亮度
        const opacity = Math.random() * 0.7 + 0.3;
        star.style.opacity = opacity.toString();
        
        // 随机动画时长
        const duration = Math.random() * 5 + 3;
        star.style.animationDuration = `${duration}s`;
        
        // 随机延迟
        star.style.animationDelay = `${Math.random() * 5}s`;
        
        starsContainer.appendChild(star);
    }
    
    // 偶尔生成流星
    setInterval(createShootingStar, 3000);
}

// 创建流星；force 为 true 时必定生成（用于按钮流星雨）
function createShootingStar(force) {
    if (!force && Math.random() > 0.2) return;
    
    const starsContainer = document.getElementById('stars-container');
    const shootingStar = document.createElement('div');
    shootingStar.classList.add('shooting-star');
    
    // 随机位置
    shootingStar.style.left = `${Math.random() * 100}vw`;
    shootingStar.style.top = `${Math.random() * 30}vh`;
    
    // 随机长度
    const length = Math.random() * 150 + 100;
    shootingStar.style.width = `${length}px`;
    
    starsContainer.appendChild(shootingStar);
    
    // 动画结束后移除元素
    setTimeout(() => {
        if (shootingStar.parentNode) {
            shootingStar.parentNode.removeChild(shootingStar);
        }
    }, 2000);
}

// 打字机效果
function typeWriterEffect() {
    const nicknameElement = document.getElementById('typewriter');
    const text = nicknameElement.textContent;
    nicknameElement.textContent = '';
    
    let i = 0;
    const speed = 150; // 打字速度（毫秒）
    
    function typeWriter() {
        if (i < text.length) {
            nicknameElement.textContent += text.charAt(i);
            i++;
            setTimeout(typeWriter, speed);
        } else {
            // 打字完成后，开始闪烁光标效果
            addCursorBlink();
        }
    }
    
    // 延迟开始打字效果
    setTimeout(typeWriter, 500);
}

// 添加闪烁光标
function addCursorBlink() {
    const nicknameElement = document.getElementById('typewriter');
    
    // 创建光标元素
    const cursor = document.createElement('span');
    cursor.classList.add('cursor');
    cursor.textContent = '|';
    cursor.style.animation = 'blink 1s infinite';
    
    nicknameElement.appendChild(cursor);
    
    // 添加光标闪烁动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// 设置微信模态框
function setupWechatModal() {
    const wechatBtn = document.getElementById('wechat-btn');
    const wechatModal = document.getElementById('wechat-modal');
    const closeModal = document.querySelector('.close-modal');
    
    if (!wechatBtn || !wechatModal) return;
    
    // 打开模态框
    wechatBtn.addEventListener('click', function(e) {
        e.preventDefault();
        wechatModal.style.display = 'flex';
    });
    
    // 关闭模态框
    closeModal.addEventListener('click', function() {
        wechatModal.style.display = 'none';
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(e) {
        if (e.target === wechatModal) {
            wechatModal.style.display = 'none';
        }
    });
}

// 设置流星雨按钮
function setupMeteorButton() {
    const meteorBtn = document.getElementById('meteor-btn');
    
    if (!meteorBtn) return;
    
    meteorBtn.addEventListener('click', function() {
        // 创建多个流星
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                createShootingStar(true);
            }, i * 200);
        }
        
        // 添加点击反馈
        meteorBtn.innerHTML = '<i class="fas fa-meteor"></i><span>流星雨发射！</span>';
        meteorBtn.style.background = 'linear-gradient(135deg, #9d4edd, #4a6fa5)';
        
        // 2秒后恢复原状
        setTimeout(() => {
            meteorBtn.innerHTML = '<i class="fas fa-meteor"></i><span>小惊喜</span>';
            meteorBtn.style.background = 'linear-gradient(135deg, #0a0a0f, #2a2a3a)';
        }, 2000);
    });
}

// 添加技能标签悬停效果
function addSkillHoverEffects() {
    const skillTags = document.querySelectorAll('.skill-tag');
    
    skillTags.forEach(tag => {
        tag.addEventListener('mouseenter', function() {
            // 添加脉动效果
            this.style.transform = 'translateY(-2px) scale(1.05)';
        });
        
        tag.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// 添加按钮交互效果
function addButtonInteractions() {
    const actionButtons = document.querySelectorAll('.action-btn');
    
    actionButtons.forEach(button => {
        button.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(-2px) scale(0.98)';
        });
        
        button.addEventListener('mouseup', function() {
            this.style.transform = 'translateY(-5px) scale(1)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // 为「我的项目」按钮：平滑滚动到 #projects
    const projectsBtn = document.querySelector('.projects-btn');
    if (projectsBtn && projectsBtn.tagName === 'A') {
        projectsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const el = document.getElementById('projects');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
    
    // 为联系按钮添加平滑滚动（占位功能）
    const contactBtn = document.querySelector('.contact-btn');
    if (contactBtn && contactBtn.tagName === 'A') {
        contactBtn.addEventListener('click', function(e) {
            e.preventDefault();
            alert('联系方式：请通过微信或邮箱联系我！');
        });
    }
}

/** 请求 GET /api/projects 并渲染卡片；失败时显示说明文案 */
async function loadProjectsFromApi() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    try {
        const res = await fetch(`${API_BASE}/api/projects`);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
            throw new Error('返回数据不是数组');
        }

        grid.textContent = '';

        if (data.length === 0) {
            const p = document.createElement('p');
            p.className = 'projects-status';
            p.textContent = '暂无项目，可在 api/data/projects.json 中添加条目。';
            grid.appendChild(p);
            return;
        }

        const frag = document.createDocumentFragment();
        data.forEach(function(item) {
            frag.appendChild(createProjectCard(item));
        });
        grid.appendChild(frag);
    } catch (err) {
        console.error('加载项目失败:', err);
        grid.textContent = '';
        const p = document.createElement('p');
        p.className = 'projects-status projects-status--error';
        p.textContent =
            '无法加载项目列表。请确认已在 api 目录启动后端：python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000，且本页通过 http://127.0.0.1:5500 打开（与 CORS 配置一致）。';
        grid.appendChild(p);
    }
}

function createProjectCard(item) {
    const card = document.createElement('article');
    card.className = 'project-card';

    const titleEl = document.createElement('h4');
    titleEl.className = 'project-card__title';
    titleEl.textContent = item.title || '未命名项目';
    card.appendChild(titleEl);

    const summaryEl = document.createElement('p');
    summaryEl.className = 'project-card__summary';
    summaryEl.textContent = item.summary || '';
    card.appendChild(summaryEl);

    const tags = Array.isArray(item.tags) ? item.tags : [];
    if (tags.length > 0) {
        const tagsWrap = document.createElement('div');
        tagsWrap.className = 'project-card__tags';
        tags.forEach(function(tag) {
            const span = document.createElement('span');
            span.className = 'project-tag';
            span.textContent = String(tag);
            tagsWrap.appendChild(span);
        });
        card.appendChild(tagsWrap);
    }

    const meta = document.createElement('div');
    meta.className = 'project-card__meta';
    const year = item.year != null ? String(item.year) : '';
    const idStr = item.id != null ? String(item.id) : '';
    meta.textContent = [year, idStr].filter(Boolean).join(' · ');
    card.appendChild(meta);

    const link = item.link;
    if (typeof link === 'string' && link.trim().startsWith('http')) {
        const a = document.createElement('a');
        a.href = link.trim();
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'project-card__link';
        a.textContent = '查看链接';
        card.appendChild(a);
    }

    return card;
}

// 主题切换功能
class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.moonIcon = this.themeToggle.querySelector('.fa-moon');
        this.sunIcon = this.themeToggle.querySelector('.fa-sun');
        this.stars = [];
        this.init();
    }

    init() {
        // 从localStorage读取主题偏好
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            this.enableLightTheme();
        } else {
            this.enableDarkTheme();
        }

        // 添加点击事件
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // 监听系统主题变化
        this.watchSystemTheme();
    }

    enableLightTheme() {
        document.body.classList.add('light-theme');
        this.moonIcon.style.display = 'none';
        this.sunIcon.style.display = 'block';
        this.updateStarsForTheme('light');
        localStorage.setItem('theme', 'light');
    }

    enableDarkTheme() {
        document.body.classList.remove('light-theme');
        this.moonIcon.style.display = 'block';
        this.sunIcon.style.display = 'none';
        this.updateStarsForTheme('dark');
        localStorage.setItem('theme', 'dark');
    }

    toggleTheme() {
        if (document.body.classList.contains('light-theme')) {
            this.enableDarkTheme();
        } else {
            this.enableLightTheme();
        }
    }

    updateStarsForTheme(theme) {
        // 获取所有星星和流星
        const stars = document.querySelectorAll('.star');
        const shootingStars = document.querySelectorAll('.shooting-star');
        
        if (theme === 'light') {
            // 亮色主题：星星变少、变淡
            stars.forEach(star => {
                star.style.opacity = '0.3';
                star.style.boxShadow = '0 0 4px rgba(49, 130, 206, 0.3)';
            });
            shootingStars.forEach(star => {
                star.style.opacity = '0.4';
            });
        } else {
            // 暗色主题：恢复正常
            stars.forEach(star => {
                star.style.opacity = '0.8';
                star.style.boxShadow = '0 0 6px rgba(255, 255, 255, 0.5)';
            });
            shootingStars.forEach(star => {
                star.style.opacity = '0.8';
            });
        }
    }

    watchSystemTheme() {
        // 监听系统主题变化
        if (window.matchMedia) {
            const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
            const prefersLightScheme = window.matchMedia('(prefers-color-scheme: light)');
            
            prefersDarkScheme.addEventListener('change', (e) => {
                if (e.matches && !localStorage.getItem('theme')) {
                    this.enableDarkTheme();
                }
            });
            
            prefersLightScheme.addEventListener('change', (e) => {
                if (e.matches && !localStorage.getItem('theme')) {
                    this.enableLightTheme();
                }
            });
        }
    }
}

// 初始化主题管理器
document.addEventListener('DOMContentLoaded', () => {
    const themeManager = new ThemeManager();
    
    // 在星星创建后重新更新一次
    setTimeout(() => {
        themeManager.updateStarsForTheme(
            document.body.classList.contains('light-theme') ? 'light' : 'dark'
        );
    }, 1000);
});
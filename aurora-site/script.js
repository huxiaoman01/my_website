// 本地开发默认请求 127.0.0.1；部署到服务器 IP 时请求同一台服务器的 8000 端口。
const API_BASE = getApiBase();
const MIN_SKELETON_MS = 300;

function getApiBase() {
    const host = window.location.hostname;
    if (host === '124.222.53.145') {
        return `${window.location.protocol}//124.222.53.145:8000`;
    }
    return 'http://127.0.0.1:8000';
}

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

    // 8. 初始化留言板
    setupGuestbook();
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
    
    // 为「给我留言」按钮：平滑滚动到 #guestbook
    const contactBtn = document.querySelector('.contact-btn');
    if (contactBtn && contactBtn.tagName === 'A') {
        contactBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const el = document.getElementById('guestbook');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
}

/** 请求 GET /api/projects 并渲染卡片；失败时显示说明文案 */
async function loadProjectsFromApi() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    renderProjectSkeletons(grid, getSkeletonCount());
    const startTime = Date.now();

    try {
        const res = await fetch(`${API_BASE}/api/projects`);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
            throw new Error('返回数据不是数组');
        }

        await ensureMinSkeletonTime(startTime);
        grid.textContent = '';
        grid.setAttribute('aria-busy', 'false');

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
        await ensureMinSkeletonTime(startTime);
        grid.textContent = '';
        grid.setAttribute('aria-busy', 'false');
        const p = document.createElement('p');
        p.className = 'projects-status projects-status--error';
        p.textContent =
            '无法加载项目列表。请确认已在 api 目录启动后端：python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000，且本页通过 http://127.0.0.1:5500 打开（与 CORS 配置一致）。';
        grid.appendChild(p);
    }
}

function getSkeletonCount() {
    return window.matchMedia('(min-width: 640px)').matches ? 4 : 2;
}

function ensureMinSkeletonTime(startTime) {
    const remaining = MIN_SKELETON_MS - (Date.now() - startTime);
    if (remaining <= 0) {
        return Promise.resolve();
    }
    return new Promise(function(resolve) {
        setTimeout(resolve, remaining);
    });
}

function renderProjectSkeletons(grid, count) {
    grid.textContent = '';
    grid.setAttribute('aria-busy', 'true');

    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
        frag.appendChild(createProjectSkeletonCard());
    }
    grid.appendChild(frag);
}

function createProjectSkeletonCard() {
    const card = document.createElement('article');
    card.className = 'project-card project-card--skeleton';
    card.setAttribute('aria-hidden', 'true');

    const title = document.createElement('div');
    title.className = 'skeleton-block skeleton-block--title';
    card.appendChild(title);

    const line1 = document.createElement('div');
    line1.className = 'skeleton-block skeleton-block--line';
    card.appendChild(line1);

    const line2 = document.createElement('div');
    line2.className = 'skeleton-block skeleton-block--line skeleton-block--short';
    card.appendChild(line2);

    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'skeleton-tags';
    for (let i = 0; i < 3; i++) {
        const tag = document.createElement('span');
        tag.className = 'skeleton-tag';
        tagsWrap.appendChild(tag);
    }
    card.appendChild(tagsWrap);

    const meta = document.createElement('div');
    meta.className = 'skeleton-block skeleton-block--meta';
    card.appendChild(meta);

    return card;
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

function setupGuestbook() {
    const form = document.getElementById('message-form');
    if (!form) return;

    form.addEventListener('submit', handleMessageSubmit);
    loadMessagesFromApi();
}

async function loadMessagesFromApi() {
    const list = document.getElementById('messages-list');
    const status = document.getElementById('messages-status');
    if (!list || !status) return;

    list.setAttribute('aria-busy', 'true');
    status.className = 'messages-status';
    status.textContent = '正在加载留言...';

    try {
        const res = await fetch(`${API_BASE}/api/messages`);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
            throw new Error('返回数据不是数组');
        }

        list.textContent = '';
        list.setAttribute('aria-busy', 'false');

        if (data.length === 0) {
            status.textContent = '还没有留言，欢迎写下第一条。';
            return;
        }

        status.textContent = '';
        const frag = document.createDocumentFragment();
        data.forEach(function(message) {
            frag.appendChild(createMessageCard(message));
        });
        list.appendChild(frag);
    } catch (err) {
        console.error('加载留言失败:', err);
        list.textContent = '';
        list.setAttribute('aria-busy', 'false');
        status.className = 'messages-status messages-status--error';
        status.textContent =
            '无法加载留言。请确认后端已启动，且 API 地址、端口和 CORS 配置一致。';
    }
}

async function handleMessageSubmit(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const nameInput = document.getElementById('message-name');
    const contentInput = document.getElementById('message-content');
    const status = document.getElementById('messages-status');
    const submitBtn = form.querySelector('.message-submit');

    const name = nameInput.value.trim();
    const content = contentInput.value.trim();

    if (!name || !content) {
        setMessageStatus('昵称和留言内容都要填写。', true);
        return;
    }
    if (name.length > 20) {
        setMessageStatus('昵称最多 20 个字。', true);
        return;
    }
    if (content.length > 300) {
        setMessageStatus('留言最多 300 个字。', true);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>发布中...</span>';
    if (status) {
        status.className = 'messages-status';
        status.textContent = '';
    }

    try {
        const res = await fetch(`${API_BASE}/api/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, content }),
        });

        if (!res.ok) {
            const detail = await readErrorDetail(res);
            throw new Error(detail || `HTTP ${res.status}`);
        }

        form.reset();
        setMessageStatus('留言已发布，谢谢你的小纸条。', false);
        await loadMessagesFromApi();
    } catch (err) {
        console.error('提交留言失败:', err);
        setMessageStatus(`发布失败：${err.message}`, true);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>发布留言</span>';
    }
}

function createMessageCard(message) {
    const article = document.createElement('article');
    article.className = 'message-card';

    const header = document.createElement('div');
    header.className = 'message-card__header';

    const name = document.createElement('strong');
    name.className = 'message-card__name';
    name.textContent = message.name || '匿名访客';
    header.appendChild(name);

    const time = document.createElement('time');
    time.className = 'message-card__time';
    time.dateTime = message.created_at || '';
    time.textContent = formatMessageTime(message.created_at);
    header.appendChild(time);

    const content = document.createElement('p');
    content.className = 'message-card__content';
    content.textContent = message.content || '';

    article.appendChild(header);
    article.appendChild(content);
    return article;
}

function formatMessageTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function setMessageStatus(text, isError) {
    const status = document.getElementById('messages-status');
    if (!status) return;

    status.className = isError
        ? 'messages-status messages-status--error'
        : 'messages-status messages-status--success';
    status.textContent = text;
}

async function readErrorDetail(res) {
    try {
        const body = await res.json();
        if (typeof body.detail === 'string') {
            return body.detail;
        }
        if (Array.isArray(body.detail)) {
            return '请检查昵称和留言长度。';
        }
    } catch (err) {
        return '';
    }
    return '';
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

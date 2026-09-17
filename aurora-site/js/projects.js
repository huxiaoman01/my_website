/** 「我的项目」区块：先渲染骨架屏，再请求 /api/projects 生成卡片。 */

import { getJson } from './api.js';

const MIN_SKELETON_MS = 300;

export async function loadProjectsFromApi(gridId = 'projects-grid') {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    renderProjectSkeletons(grid, getSkeletonCount());
    const startTime = Date.now();

    try {
        const data = await getJson('/projects');
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
        data.forEach((item) => {
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
            '无法加载项目列表。请确认后端已启动：在 api 目录执行 python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000，并通过 http://127.0.0.1:8000/ 打开本页。';
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
    return new Promise((resolve) => {
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
        tags.forEach((tag) => {
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

    const link = typeof item.link === 'string' ? item.link.trim() : '';
    if (link) {
        const isExternal = link.startsWith('http://') || link.startsWith('https://');
        const a = document.createElement('a');
        a.href = link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'project-card__link';
        a.textContent = isExternal ? '查看链接' : '查看成果';
        card.appendChild(a);
    }

    return card;
}

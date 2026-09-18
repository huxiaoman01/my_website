/** 项目详情页：读取 ?id= 后请求 /api/projects/{id}，渲染详情或降级提示。 */

import { getJson } from './api.js';

const SITE_TITLE = "Aurora's World";

export async function renderProjectDetail(containerId = 'project-detail') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const projectId = new URLSearchParams(window.location.search).get('id');
    if (!projectId) {
        renderMessage(
            container,
            '缺少项目参数',
            '地址里需要带上项目编号，例如 project.html?id=xingwei-community。',
        );
        return;
    }

    try {
        const project = await getJson(`/projects/${encodeURIComponent(projectId)}`);
        renderProject(container, project);
    } catch (err) {
        console.error('加载项目详情失败:', err);
        renderMessage(
            container,
            '没有找到这个项目',
            '请确认项目编号是否正确，或返回首页从项目卡片重新进入。',
        );
    }
}

function renderProject(container, project) {
    const detail = project.detail || null;

    container.textContent = '';
    container.setAttribute('aria-busy', 'false');
    document.title = `${project.title} · ${SITE_TITLE}`;

    container.appendChild(buildHeader(project, detail));

    if (detail) {
        const metrics = Array.isArray(detail.metrics) ? detail.metrics : [];
        if (metrics.length) {
            container.appendChild(buildMetrics(metrics));
        }

        if (Array.isArray(detail.stack) && detail.stack.length) {
            const stack = document.createElement('p');
            stack.className = 'detail-stack';
            stack.textContent = `技术栈：${detail.stack.join(' / ')}`;
            container.appendChild(stack);
        }

        const sections = Array.isArray(detail.sections) ? detail.sections : [];
        sections.forEach((section) => container.appendChild(buildSection(section)));
    } else {
        const hint = document.createElement('p');
        hint.className = 'detail-hint';
        hint.textContent = '这个项目还没有补充详细内容，可以先看看上方简介，或返回首页浏览其它项目。';
        container.appendChild(hint);
    }

    container.appendChild(buildActions(project, detail));
}

function buildHeader(project, detail) {
    const header = document.createElement('header');
    header.className = 'detail-header';

    const title = document.createElement('h1');
    title.className = 'detail-title';
    title.textContent = project.title || '未命名项目';
    header.appendChild(title);

    const metaParts = [];
    if (detail && detail.role) metaParts.push(detail.role);
    if (detail && detail.period) metaParts.push(detail.period);
    if (project.year != null) metaParts.push(String(project.year));
    if (metaParts.length) {
        const meta = document.createElement('p');
        meta.className = 'detail-meta';
        meta.textContent = metaParts.join(' · ');
        header.appendChild(meta);
    }

    const summary = document.createElement('p');
    summary.className = 'detail-summary';
    summary.textContent = project.summary || '';
    header.appendChild(summary);

    const tags = Array.isArray(project.tags) ? project.tags : [];
    if (tags.length) {
        const tagsWrap = document.createElement('div');
        tagsWrap.className = 'detail-tags';
        tags.forEach((tag) => {
            const span = document.createElement('span');
            span.className = 'project-tag';
            span.textContent = String(tag);
            tagsWrap.appendChild(span);
        });
        header.appendChild(tagsWrap);
    }

    return header;
}

function buildMetrics(metrics) {
    const grid = document.createElement('div');
    grid.className = 'detail-metrics';

    metrics.forEach((metric) => {
        const card = document.createElement('div');
        card.className = 'metric-card';

        const value = document.createElement('strong');
        value.className = 'metric-card__value';
        value.textContent = metric.value ?? '';

        const label = document.createElement('span');
        label.className = 'metric-card__label';
        label.textContent = metric.label ?? '';

        card.append(value, label);
        grid.appendChild(card);
    });

    return grid;
}

function buildSection(section) {
    const block = document.createElement('section');
    block.className = 'detail-section';

    const heading = document.createElement('h2');
    heading.className = 'detail-section__title';
    heading.textContent = section.heading || '';
    block.appendChild(heading);

    const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs : [];
    paragraphs.forEach((text) => {
        const p = document.createElement('p');
        p.textContent = text;
        block.appendChild(p);
    });

    const bullets = Array.isArray(section.bullets) ? section.bullets : [];
    if (bullets.length) {
        const ul = document.createElement('ul');
        bullets.forEach((text) => {
            const li = document.createElement('li');
            li.textContent = text;
            ul.appendChild(li);
        });
        block.appendChild(ul);
    }

    return block;
}

function buildActions(project, detail) {
    const wrap = document.createElement('div');
    wrap.className = 'detail-actions';

    const detailLinks = (detail && Array.isArray(detail.links)) ? detail.links : [];
    const usedHrefs = new Set();

    detailLinks.forEach((link) => {
        if (!link || !link.href) return;
        usedHrefs.add(link.href);
        wrap.appendChild(buildLink(link.label || '查看链接', link.href));
    });

    const link = typeof project.link === 'string' ? project.link.trim() : '';
    if (link && !usedHrefs.has(link)) {
        const isExternal = link.startsWith('http://') || link.startsWith('https://');
        wrap.appendChild(buildLink(isExternal ? '查看链接' : '查看成果', link));
    }

    const back = document.createElement('a');
    back.className = 'detail-action detail-action--ghost';
    back.href = 'index.html';
    back.textContent = '返回首页';
    wrap.appendChild(back);

    return wrap;
}

function buildLink(label, href) {
    const a = document.createElement('a');
    a.className = 'detail-action';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    return a;
}

function renderMessage(container, titleText, hintText) {
    container.textContent = '';
    container.setAttribute('aria-busy', 'false');

    const title = document.createElement('h1');
    title.className = 'detail-title';
    title.textContent = titleText;

    const hint = document.createElement('p');
    hint.className = 'detail-hint';
    hint.textContent = hintText;

    const back = document.createElement('a');
    back.className = 'detail-action';
    back.href = 'index.html';
    back.textContent = '返回首页';

    container.append(title, hint, back);
    document.title = `${titleText} · ${SITE_TITLE}`;
}

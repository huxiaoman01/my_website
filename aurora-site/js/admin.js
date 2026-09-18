/** 简历申请管理：口令登录、查看申请、通过/拒绝、复制专属链接、撤销访问码。 */

import { getJson, postJson } from './api.js';

const STATUS_TEXT = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };

const loginForm = document.getElementById('admin-login-form');
const panel = document.getElementById('admin-panel');
const listEl = document.getElementById('admin-list');
const countEl = document.getElementById('admin-count');

// 生成给访客的链接要用对外地址，隧道地址不能发出去
const publicOrigin = (window.AURORA_PUBLIC_ORIGIN || window.location.origin).replace(/\/+$/, '');

if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

document.getElementById('admin-refresh')?.addEventListener('click', loadRequests);
document.getElementById('admin-logout')?.addEventListener('click', handleLogout);

loadRequests();

async function loadRequests() {
    try {
        const rows = await getJson('/admin/requests');
        renderRows(rows);
        showPanel(true);
    } catch (err) {
        showPanel(false);
        if (err.message.includes('登录')) {
            setStatus('输入口令后可管理申请。', false);
        } else {
            setStatus(`加载失败：${err.message}`, true);
        }
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const input = document.getElementById('admin-token');
    const token = input.value.trim();
    if (!token) {
        setStatus('请输入口令。', true);
        return;
    }

    try {
        await postJson('/admin/login', { token });
        input.value = '';
        setStatus('登录成功。', false);
        await loadRequests();
    } catch (err) {
        console.error('登录失败:', err);
        setStatus(`登录失败：${err.message}`, true);
    }
}

async function handleLogout() {
    try {
        await postJson('/admin/logout', {});
    } catch (err) {
        console.error('退出失败:', err);
    }
    showPanel(false);
    setStatus('已退出登录。', false);
}

function showPanel(visible) {
    if (panel) panel.hidden = !visible;
    if (loginForm) loginForm.hidden = visible;
}

function renderRows(rows) {
    if (!listEl) return;
    listEl.textContent = '';

    const pending = rows.filter((row) => row.status === 'pending').length;
    if (countEl) countEl.textContent = `共 ${rows.length} 条申请，其中待审核 ${pending} 条`;

    if (rows.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'detail-hint';
        empty.textContent = '还没有收到申请。';
        listEl.appendChild(empty);
        return;
    }

    rows.forEach((row) => listEl.appendChild(buildRow(row)));
}

function buildRow(row) {
    const item = document.createElement('div');
    item.className = 'admin-item';

    const head = document.createElement('div');
    head.className = 'admin-item__head';

    const name = document.createElement('strong');
    name.textContent = row.name;
    head.appendChild(name);

    const badge = document.createElement('span');
    badge.className = `admin-badge admin-badge--${row.status}`;
    badge.textContent = STATUS_TEXT[row.status] || row.status;
    head.appendChild(badge);

    const time = document.createElement('span');
    time.className = 'admin-item__time';
    time.textContent = formatTime(row.created_at);
    head.appendChild(time);
    item.appendChild(head);

    item.appendChild(line('联系方式', row.contact));
    item.appendChild(line('用途', row.purpose));

    if (row.code) {
        const detail = line('访问码', row.code);
        const meta = document.createElement('span');
        meta.className = 'admin-item__meta';
        meta.textContent = row.revoked_at
            ? ` · 已撤销 · 用过 ${row.use_count} 次`
            : ` · 到期 ${formatTime(row.expires_at)} · 用过 ${row.use_count} 次`;
        detail.appendChild(meta);
        item.appendChild(detail);
    }

    const actions = document.createElement('div');
    actions.className = 'admin-item__actions';

    if (row.status === 'pending') {
        actions.appendChild(actionButton('通过并生成访问码', 'detail-action', () => approve(row.id)));
        actions.appendChild(actionButton('拒绝', 'detail-action detail-action--ghost', () => reject(row.id)));
    }

    if (row.code && !row.revoked_at) {
        const link = `${publicOrigin}/resume.html?code=${encodeURIComponent(row.code)}`;
        actions.appendChild(actionButton('复制专属链接', 'detail-action', () => copyText(link)));
        actions.appendChild(actionButton('复制访问码', 'detail-action detail-action--ghost', () => copyText(row.code)));
        actions.appendChild(actionButton('撤销', 'detail-action detail-action--ghost', () => revoke(row.code)));
    }

    if (actions.childElementCount > 0) {
        item.appendChild(actions);
    }

    return item;
}

function line(label, value) {
    const p = document.createElement('p');
    p.className = 'admin-item__line';

    const labelEl = document.createElement('span');
    labelEl.className = 'admin-item__label';
    labelEl.textContent = `${label}：`;
    p.appendChild(labelEl);

    p.appendChild(document.createTextNode(value ?? ''));
    return p;
}

function actionButton(text, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    button.addEventListener('click', async () => {
        button.disabled = true;
        try {
            await handler();
        } catch (err) {
            console.error('操作失败:', err);
            setStatus(`操作失败：${err.message}`, true);
        } finally {
            button.disabled = false;
        }
    });
    return button;
}

async function approve(requestId) {
    const row = await postJson(`/admin/requests/${requestId}/approve`, {});
    await loadRequests();
    if (row?.code) {
        setStatus(`已通过，访问码 ${row.code}（可用「复制专属链接」直接发给对方）。`, false);
    }
}

async function reject(requestId) {
    await postJson(`/admin/requests/${requestId}/reject`, {});
    await loadRequests();
    setStatus('已拒绝该申请。', false);
}

async function revoke(code) {
    await postJson(`/admin/codes/${encodeURIComponent(code)}/revoke`, {});
    await loadRequests();
    setStatus(`访问码 ${code} 已撤销，对方立即无法访问。`, false);
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        setStatus(`已复制：${text}`, false);
    } catch (err) {
        // 无剪贴板权限时退化为手动复制
        window.prompt('复制下面的内容：', text);
    }
}

function formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function setStatus(text, isError) {
    const status = document.getElementById('admin-status');
    if (!status) return;

    if (!text) {
        status.className = 'messages-status';
        status.textContent = '';
        return;
    }

    status.className = isError
        ? 'messages-status messages-status--error'
        : 'messages-status messages-status--success';
    status.textContent = text;
}

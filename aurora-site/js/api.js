/**
 * 统一接口访问层。
 *
 * 默认走同源 `/api`：本地由 FastAPI 同时提供页面与接口，生产由 Nginx 反代。
 * 如果仍用独立的静态服务器（例如 5500 端口）打开页面，可在 index.html 的
 * 模块脚本之前加一行：window.AURORA_API_BASE = 'http://127.0.0.1:8000';
 */
const base = window.AURORA_API_BASE || '/api';

export const API_BASE = base.replace(/\/+$/, '');

/** 从错误响应里取出可展示的提示文案，取不到时返回空串。 */
async function readErrorDetail(response) {
    try {
        const body = await response.json();
        if (typeof body.detail === 'string') {
            return body.detail;
        }
        if (Array.isArray(body.detail)) {
            return '请检查昵称和留言长度。';
        }
        if (body.detail && Array.isArray(body.detail.errors)) {
            return '请求参数不合法，请检查输入内容。';
        }
    } catch (err) {
        return '';
    }
    return '';
}

async function request(path, options) {
    const response = await fetch(`${API_BASE}${path}`, options);
    if (!response.ok) {
        const detail = await readErrorDetail(response);
        throw new Error(detail || `HTTP ${response.status}`);
    }
    return response.json();
}

export function getJson(path) {
    return request(path);
}

export function postJson(path, payload) {
    return request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
}

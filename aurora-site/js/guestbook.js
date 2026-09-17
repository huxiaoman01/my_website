/** 留言板：加载最近留言、提交新留言，并维护表单与状态提示。 */

import { getJson, postJson } from './api.js';

const NAME_MAX_LENGTH = 20;
const CONTENT_MAX_LENGTH = 300;

export function setupGuestbook(formId = 'message-form') {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', handleMessageSubmit);
    loadMessagesFromApi();
}

export async function loadMessagesFromApi(
    listId = 'messages-list',
    statusId = 'messages-status',
) {
    const list = document.getElementById(listId);
    const status = document.getElementById(statusId);
    if (!list || !status) return;

    list.setAttribute('aria-busy', 'true');
    status.className = 'messages-status';
    status.textContent = '正在加载留言...';

    try {
        const data = await getJson('/messages');
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
        data.forEach((message) => {
            frag.appendChild(createMessageCard(message));
        });
        list.appendChild(frag);
    } catch (err) {
        console.error('加载留言失败:', err);
        list.textContent = '';
        list.setAttribute('aria-busy', 'false');
        status.className = 'messages-status messages-status--error';
        status.textContent = '无法加载留言。请确认后端已启动，并通过 http://127.0.0.1:8000/ 打开本页。';
    }
}

async function handleMessageSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const nameInput = document.getElementById('message-name');
    const contentInput = document.getElementById('message-content');
    const submitBtn = form.querySelector('.message-submit');
    if (!nameInput || !contentInput) return;

    const name = nameInput.value.trim();
    const content = contentInput.value.trim();

    if (!name || !content) {
        setMessageStatus('昵称和留言内容都要填写。', true);
        return;
    }
    if (name.length > NAME_MAX_LENGTH) {
        setMessageStatus(`昵称最多 ${NAME_MAX_LENGTH} 个字。`, true);
        return;
    }
    if (content.length > CONTENT_MAX_LENGTH) {
        setMessageStatus(`留言最多 ${CONTENT_MAX_LENGTH} 个字。`, true);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>发布中...</span>';
    setMessageStatus('');

    try {
        await postJson('/messages', { name, content });

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

function setMessageStatus(text, isError = false) {
    const status = document.getElementById('messages-status');
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

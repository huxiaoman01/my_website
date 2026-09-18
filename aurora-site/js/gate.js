/** 简历门禁页：提交访问申请，或用访问码解锁。 */

import { postJson } from './api.js';

const requestForm = document.getElementById('gate-request-form');
const unlockForm = document.getElementById('gate-unlock-form');

if (requestForm) {
    requestForm.addEventListener('submit', handleRequestSubmit);
}

if (unlockForm) {
    unlockForm.addEventListener('submit', handleUnlockSubmit);
}

async function handleRequestSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('gate-name').value.trim();
    const contact = document.getElementById('gate-contact').value.trim();
    const purpose = document.getElementById('gate-purpose').value.trim();
    const submitBtn = requestForm.querySelector('.message-submit');

    if (!name || !contact || !purpose) {
        setStatus('gate-status', '三项都填一下，方便我判断来人身份。', true);
        return;
    }

    setBusy(submitBtn, true, '<i class="fas fa-spinner fa-spin"></i><span>提交中...</span>');
    try {
        const result = await postJson('/resume/requests', { name, contact, purpose });
        requestForm.reset();
        setStatus('gate-status', `${result.message}（申请编号 #${result.id}）`, false);
    } catch (err) {
        console.error('提交申请失败:', err);
        setStatus('gate-status', `提交失败：${err.message}`, true);
    } finally {
        setBusy(submitBtn, false, '<i class="fas fa-paper-plane"></i><span>提交申请</span>');
    }
}

async function handleUnlockSubmit(event) {
    event.preventDefault();

    const input = document.getElementById('gate-code');
    const code = input.value.trim().toUpperCase();
    const submitBtn = unlockForm.querySelector('.message-submit');

    if (!code) {
        setStatus('gate-unlock-status', '请填写访问码。', true);
        return;
    }

    setBusy(submitBtn, true, '<i class="fas fa-spinner fa-spin"></i><span>校验中...</span>');
    try {
        await postJson('/resume/unlock', { code });
        setStatus('gate-unlock-status', '校验通过，正在打开简历…', false);
        window.location.href = 'resume.html';
    } catch (err) {
        console.error('访问码校验失败:', err);
        setStatus('gate-unlock-status', `打不开：${err.message}`, true);
    } finally {
        setBusy(submitBtn, false, '<i class="fas fa-unlock"></i><span>打开简历</span>');
    }
}

function setBusy(button, busy, html) {
    if (!button) return;
    button.disabled = busy;
    button.innerHTML = html;
}

function setStatus(elementId, text, isError) {
    const status = document.getElementById(elementId);
    if (!status) return;

    status.className = isError
        ? 'messages-status messages-status--error'
        : 'messages-status messages-status--success';
    status.textContent = text;
}

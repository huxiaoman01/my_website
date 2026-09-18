"""鉴权辅助：访问码生成、签名凭证与进程内限流/锁定。"""

import hmac
import secrets
import time
from hashlib import sha256
from threading import Lock

# 去掉容易看错的字符（0/O、1/I/L），避免口头传达访问码时出错
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 8


def generate_code(length: int = CODE_LENGTH) -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(length))


def sign(secret: str, payload: str) -> str:
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), sha256).hexdigest()


def verify(secret: str, payload: str, signature: str) -> bool:
    if not secret or not signature:
        return False
    return hmac.compare_digest(sign(secret, payload), signature)


def constant_time_equals(left: str, right: str) -> bool:
    return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))


def make_token(secret: str, scope: str, subject: str, expires_at: int) -> str:
    """生成形如 <subject>.<expires_at>.<signature> 的签名凭证。"""
    payload = f"{scope}:{subject}:{expires_at}"
    return f"{subject}.{expires_at}.{sign(secret, payload)}"


def parse_token(secret: str, scope: str, token: str) -> tuple[str, int] | None:
    """校验签名与有效期，通过时返回 (subject, expires_at)，否则返回 None。"""
    parts = (token or "").split(".")
    if len(parts) != 3:
        return None

    subject, expires_raw, signature = parts
    try:
        expires_at = int(expires_raw)
    except ValueError:
        return None

    if expires_at < int(time.time()):
        return None
    if not verify(secret, f"{scope}:{subject}:{expires_at}", signature):
        return None
    return subject, expires_at


class RateLimiter:
    """进程内滑动窗口限流：同一 key 在窗口内超过次数即拒绝。"""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, list[float]] = {}
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.time()
        with self._lock:
            hits = [stamp for stamp in self._hits.get(key, []) if now - stamp < self.window]
            if len(hits) >= self.limit:
                self._hits[key] = hits
                return False
            hits.append(now)
            self._hits[key] = hits
            return True

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


class FailureGuard:
    """连续失败达到上限后锁定一段时间，用于管理员口令尝试。"""

    def __init__(self, max_failures: int, lock_seconds: int) -> None:
        self.max_failures = max_failures
        self.lock_seconds = lock_seconds
        self._state: dict[str, tuple[int, float]] = {}
        self._lock = Lock()

    def is_locked(self, key: str) -> bool:
        with self._lock:
            failures, locked_until = self._state.get(key, (0, 0.0))
            return failures >= self.max_failures and locked_until > time.time()

    def remaining_lock_seconds(self, key: str) -> int:
        with self._lock:
            _, locked_until = self._state.get(key, (0, 0.0))
            return max(int(locked_until - time.time()), 0)

    def record_failure(self, key: str) -> None:
        with self._lock:
            failures, _ = self._state.get(key, (0, 0.0))
            failures += 1
            locked_until = time.time() + self.lock_seconds if failures >= self.max_failures else 0.0
            self._state[key] = (failures, locked_until)

    def reset(self, key: str) -> None:
        with self._lock:
            self._state.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._state.clear()

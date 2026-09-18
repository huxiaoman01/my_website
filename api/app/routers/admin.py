"""管理后台接口：仅通过本机（SSH 隧道）访问，口令登录后管理简历申请。"""

import sqlite3
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request, Response

from ..db import RESUME_TABLES, session
from ..schemas import AdminLogin, ResumeRequest
from ..security import (
    FailureGuard,
    constant_time_equals,
    generate_code,
    make_token,
    parse_token,
)
from .resume import client_ip, now_utc

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_COOKIE = "admin_session"
ADMIN_SCOPE = "admin"
SESSION_HOURS = 12
MAX_CODE_ATTEMPTS = 5

login_guard = FailureGuard(max_failures=5, lock_seconds=1800)


def require_admin(request: Request) -> None:
    settings = request.app.state.settings
    if not settings.admin_token:
        raise HTTPException(status_code=403, detail="管理后台未启用：未配置 AURORA_ADMIN_TOKEN")

    token = request.cookies.get(ADMIN_COOKIE, "")
    if not parse_token(settings.admin_token, ADMIN_SCOPE, token):
        raise HTTPException(status_code=403, detail="需要管理员登录")


def _request_row(conn: sqlite3.Connection, request_id: int) -> dict | None:
    row = conn.execute(
        """
        SELECT r.id, r.name, r.contact, r.purpose, r.status, r.created_at, r.reviewed_at,
               c.code, c.expires_at, c.revoked_at, c.last_used_at,
               COALESCE(c.use_count, 0) AS use_count
        FROM resume_requests r
        LEFT JOIN resume_codes c ON c.id = (
            SELECT id FROM resume_codes WHERE request_id = r.id ORDER BY id DESC LIMIT 1
        )
        WHERE r.id = ?
        """,
        (request_id,),
    ).fetchone()
    return dict(row) if row else None


@router.post("/login", summary="管理员登录")
def login(payload: AdminLogin, request: Request, response: Response) -> dict:
    settings = request.app.state.settings
    if not settings.admin_token:
        raise HTTPException(status_code=403, detail="管理后台未启用：未配置 AURORA_ADMIN_TOKEN")

    ip = client_ip(request)
    if login_guard.is_locked(ip):
        minutes = login_guard.remaining_lock_seconds(ip) // 60 + 1
        raise HTTPException(status_code=429, detail=f"尝试次数过多，请约 {minutes} 分钟后再试")

    if not constant_time_equals(settings.admin_token, payload.token.strip()):
        login_guard.record_failure(ip)
        raise HTTPException(status_code=403, detail="口令不正确")

    login_guard.reset(ip)
    expires_at = now_utc() + timedelta(hours=SESSION_HOURS)
    token = make_token(settings.admin_token, ADMIN_SCOPE, "owner", int(expires_at.timestamp()))
    response.set_cookie(
        ADMIN_COOKIE,
        token,
        max_age=SESSION_HOURS * 3600,
        httponly=True,
        samesite="strict",
        path="/",
    )
    return {"ok": True, "expires_at": expires_at.isoformat()}


@router.post("/logout", summary="退出管理员登录")
def logout(response: Response) -> dict:
    response.delete_cookie(ADMIN_COOKIE, path="/")
    return {"ok": True}


@router.get("/requests", response_model=list[ResumeRequest], summary="申请列表")
def list_requests(request: Request) -> list[ResumeRequest]:
    require_admin(request)
    settings = request.app.state.settings

    with session(settings.resume_db, RESUME_TABLES) as conn:
        rows = conn.execute(
            """
            SELECT r.id, r.name, r.contact, r.purpose, r.status, r.created_at, r.reviewed_at,
                   c.code, c.expires_at, c.revoked_at, c.last_used_at,
                   COALESCE(c.use_count, 0) AS use_count
            FROM resume_requests r
            LEFT JOIN resume_codes c ON c.id = (
                SELECT id FROM resume_codes WHERE request_id = r.id ORDER BY id DESC LIMIT 1
            )
            ORDER BY r.created_at DESC, r.id DESC
            LIMIT 200
            """
        ).fetchall()
    return [dict(row) for row in rows]


@router.post(
    "/requests/{request_id}/approve",
    response_model=ResumeRequest,
    summary="通过申请并生成访问码",
)
def approve(request_id: int, request: Request) -> ResumeRequest:
    require_admin(request)
    settings = request.app.state.settings
    now = now_utc()
    expires_at = now + timedelta(days=settings.resume_days)

    with session(settings.resume_db, RESUME_TABLES) as conn:
        if _request_row(conn, request_id) is None:
            raise HTTPException(status_code=404, detail="申请不存在")

        # 同一份申请只保留一个有效访问码：旧的先撤销
        conn.execute(
            "UPDATE resume_codes SET revoked_at = ? WHERE request_id = ? AND revoked_at IS NULL",
            (now.isoformat(), request_id),
        )

        for _ in range(MAX_CODE_ATTEMPTS):
            code = generate_code()
            try:
                conn.execute(
                    """
                    INSERT INTO resume_codes (request_id, code, created_at, expires_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (request_id, code, now.isoformat(), expires_at.isoformat()),
                )
                break
            except sqlite3.IntegrityError:
                continue
        else:
            raise HTTPException(status_code=500, detail="生成访问码失败，请重试")

        conn.execute(
            "UPDATE resume_requests SET status = 'approved', reviewed_at = ? WHERE id = ?",
            (now.isoformat(), request_id),
        )
        row = _request_row(conn, request_id)

    return row


@router.post(
    "/requests/{request_id}/reject",
    response_model=ResumeRequest,
    summary="拒绝申请",
)
def reject(request_id: int, request: Request) -> ResumeRequest:
    require_admin(request)
    settings = request.app.state.settings
    now = now_utc()

    with session(settings.resume_db, RESUME_TABLES) as conn:
        if _request_row(conn, request_id) is None:
            raise HTTPException(status_code=404, detail="申请不存在")

        conn.execute(
            "UPDATE resume_codes SET revoked_at = ? WHERE request_id = ? AND revoked_at IS NULL",
            (now.isoformat(), request_id),
        )
        conn.execute(
            "UPDATE resume_requests SET status = 'rejected', reviewed_at = ? WHERE id = ?",
            (now.isoformat(), request_id),
        )
        row = _request_row(conn, request_id)

    return row


@router.post(
    "/codes/{code}/revoke",
    response_model=ResumeRequest,
    summary="撤销访问码",
)
def revoke(code: str, request: Request) -> ResumeRequest:
    require_admin(request)
    settings = request.app.state.settings

    with session(settings.resume_db, RESUME_TABLES) as conn:
        row = conn.execute(
            "SELECT request_id FROM resume_codes WHERE code = ?",
            (code.strip().upper(),),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="访问码不存在")

        conn.execute(
            "UPDATE resume_codes SET revoked_at = ? WHERE code = ? AND revoked_at IS NULL",
            (now_utc().isoformat(), code.strip().upper()),
        )
        record = _request_row(conn, row["request_id"])

    return record

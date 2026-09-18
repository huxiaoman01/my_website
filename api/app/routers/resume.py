"""简历授权：申请、访问码解锁，以及受保护简历页与 PDF 的返回。"""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse

from ..db import RESUME_TABLES, session
from ..schemas import ResumeRequestAccepted, ResumeRequestCreate, ResumeUnlock
from ..security import RateLimiter, make_token, parse_token

router = APIRouter(tags=["resume"])

RESUME_COOKIE = "resume_access"
RESUME_SCOPE = "resume"

# 受保护的响应绝不能被缓存：撤销访问码后必须立刻失效
NO_STORE = {"Cache-Control": "no-store"}

# 未配置 AURORA_ADMIN_TOKEN 时用进程内随机密钥兜底：本地开发可用，重启后失效
_FALLBACK_SECRET = secrets.token_hex(16)

request_limiter = RateLimiter(limit=5, window_seconds=3600)
unlock_limiter = RateLimiter(limit=10, window_seconds=600)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _secret(settings) -> str:
    return settings.admin_token or _FALLBACK_SECRET


def find_valid_code(settings, code: str):
    """返回仍然有效的访问码记录（存在、未撤销、未过期），否则返回 None。"""
    with session(settings.resume_db, RESUME_TABLES) as conn:
        row = conn.execute(
            "SELECT id, code, expires_at, revoked_at FROM resume_codes WHERE code = ?",
            (code,),
        ).fetchone()

    if row is None or row["revoked_at"]:
        return None
    try:
        expires_at = datetime.fromisoformat(row["expires_at"])
    except ValueError:
        return None
    if expires_at < now_utc():
        return None
    return row


def touch_code(settings, code_id: int) -> None:
    with session(settings.resume_db, RESUME_TABLES) as conn:
        conn.execute(
            "UPDATE resume_codes SET last_used_at = ?, use_count = use_count + 1 WHERE id = ?",
            (now_utc().isoformat(), code_id),
        )


def is_unlocked(settings, token: str) -> bool:
    """校验 cookie 里的访问码当前是否仍然有效（撤销即时生效）。"""
    parsed = parse_token(_secret(settings), RESUME_SCOPE, token)
    if not parsed:
        return False

    code, _ = parsed
    row = find_valid_code(settings, code)
    if row is None:
        return False

    touch_code(settings, row["id"])
    return True


def gate_response(settings, error: str = "") -> HTMLResponse:
    gate_file = settings.static_dir / "resume-gate.html"
    if not gate_file.is_file():
        raise HTTPException(status_code=404, detail="门禁页缺失")

    html = gate_file.read_text(encoding="utf-8")
    if error:
        banner = f'<p class="gate-error" role="alert">{error}</p>'
    else:
        banner = ""
    return HTMLResponse(html.replace("<!--GATE_ERROR-->", banner), headers=NO_STORE)


@router.post(
    "/api/resume/requests",
    response_model=ResumeRequestAccepted,
    status_code=201,
    summary="提交简历访问申请",
)
def create_request(payload: ResumeRequestCreate, request: Request) -> ResumeRequestAccepted:
    settings = request.app.state.settings
    if not request_limiter.allow(client_ip(request)):
        raise HTTPException(status_code=429, detail="提交过于频繁，请稍后再试")

    with session(settings.resume_db, RESUME_TABLES) as conn:
        cursor = conn.execute(
            """
            INSERT INTO resume_requests (name, contact, purpose, status, created_at)
            VALUES (?, ?, ?, 'pending', ?)
            """,
            (payload.name, payload.contact, payload.purpose, now_utc().isoformat()),
        )
        request_id = cursor.lastrowid

    return ResumeRequestAccepted(
        id=request_id,
        status="pending",
        message="申请已提交，等待审核。通过后会把访问链接发给你。",
    )


@router.post("/api/resume/unlock", summary="使用访问码解锁简历")
def unlock(payload: ResumeUnlock, request: Request, response: Response) -> dict:
    settings = request.app.state.settings
    if not unlock_limiter.allow(client_ip(request)):
        raise HTTPException(status_code=429, detail="尝试过于频繁，请稍后再试")

    code = payload.code.strip().upper()
    row = find_valid_code(settings, code)
    if row is None:
        raise HTTPException(status_code=403, detail="访问码无效、已过期或已被撤销")

    expires_at = datetime.fromisoformat(row["expires_at"])
    max_age = max(int((expires_at - now_utc()).total_seconds()), 60)
    token = make_token(_secret(settings), RESUME_SCOPE, code, int(expires_at.timestamp()))
    response.set_cookie(
        RESUME_COOKIE,
        token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        path="/",
    )
    return {"ok": True, "expires_at": row["expires_at"]}


@router.get("/api/resume/access", summary="查询当前是否已获授权")
def access_status(request: Request) -> dict:
    settings = request.app.state.settings
    token = request.cookies.get(RESUME_COOKIE, "")
    return {"allowed": is_unlocked(settings, token)}


@router.api_route("/resume.html", methods=["GET", "HEAD"], include_in_schema=False)
def resume_page(request: Request, code: str | None = None):
    """无凭证时返回门禁页；带有效 ?code= 时下发 cookie 并跳到干净地址。"""
    settings = request.app.state.settings

    if code:
        row = find_valid_code(settings, code.strip().upper())
        if row is None:
            return gate_response(settings, "访问码无效、已过期或已被撤销，请重新申请。")

        expires_at = datetime.fromisoformat(row["expires_at"])
        token = make_token(_secret(settings), RESUME_SCOPE, row["code"], int(expires_at.timestamp()))
        redirect = RedirectResponse(url="/resume.html", status_code=302, headers=NO_STORE)
        redirect.set_cookie(
            RESUME_COOKIE,
            token,
            max_age=max(int((expires_at - now_utc()).total_seconds()), 60),
            httponly=True,
            samesite="lax",
            path="/",
        )
        return redirect

    token = request.cookies.get(RESUME_COOKIE, "")
    if is_unlocked(settings, token):
        if not settings.resume_html.is_file():
            raise HTTPException(status_code=404, detail="简历文件不存在")
        return FileResponse(settings.resume_html, media_type="text/html", headers=NO_STORE)

    return gate_response(settings)


@router.api_route("/assets/pdf/resume.pdf", methods=["GET", "HEAD"], include_in_schema=False)
def resume_pdf(request: Request):
    settings = request.app.state.settings
    token = request.cookies.get(RESUME_COOKIE, "")
    if not is_unlocked(settings, token):
        raise HTTPException(status_code=403, detail="需要授权后才能下载简历")
    if not settings.resume_pdf.is_file():
        raise HTTPException(status_code=404, detail="简历文件不存在")

    return FileResponse(
        settings.resume_pdf,
        media_type="application/pdf",
        filename="resume.pdf",
        headers=NO_STORE,
    )

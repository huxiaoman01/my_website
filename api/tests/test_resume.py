"""简历授权：门禁、申请、审核、访问码解锁与受保护路由。"""

from datetime import datetime, timedelta, timezone

from app.db import RESUME_TABLES, session
from conftest import ADMIN_TOKEN

APPLICATION = {"name": "张三", "contact": "zhang@example.com", "purpose": "招聘"}


def submit(client, payload: dict | None = None):
    return client.post("/api/resume/requests", json=payload or APPLICATION)


def admin_login(client):
    return client.post("/api/admin/login", json={"token": ADMIN_TOKEN})


def approve_and_get_code(client, request_id: int) -> str:
    response = client.post(f"/api/admin/requests/{request_id}/approve")
    assert response.status_code == 200
    return response.json()["code"]


def test_gate_page_is_shown_without_credential(resume_client):
    response = resume_client.get("/resume.html")

    assert response.status_code == 200
    assert "简历需要授权查看" in response.text
    assert "胡筱漫的简历正文" not in response.text


def test_resume_pdf_is_forbidden_without_credential(resume_client):
    response = resume_client.get("/assets/pdf/resume.pdf")

    assert response.status_code == 403


def test_head_requests_follow_the_same_rules(resume_client):
    assert resume_client.head("/resume.html").status_code == 200
    assert resume_client.head("/assets/pdf/resume.pdf").status_code == 403


def test_gate_page_is_publicly_reachable(resume_client):
    assert resume_client.get("/resume-gate.html").status_code == 200


def test_application_requires_all_fields(resume_client):
    response = resume_client.post(
        "/api/resume/requests",
        json={"name": "张三", "contact": "  ", "purpose": "招聘"},
    )

    assert response.status_code == 400
    assert response.json()["errors"]


def test_application_is_stored_as_pending(resume_client):
    response = submit(resume_client, {"name": " 张三 ", "contact": "a@b.com", "purpose": " 招聘 "})

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["id"] >= 1


def test_application_is_rate_limited(resume_client):
    for _ in range(5):
        assert submit(resume_client).status_code == 201

    assert submit(resume_client).status_code == 429


def test_admin_api_requires_login(resume_client):
    assert resume_client.get("/api/admin/requests").status_code == 403


def test_admin_request_list_includes_pending_application(resume_client):
    request_id = submit(resume_client).json()["id"]
    admin_login(resume_client)

    response = resume_client.get("/api/admin/requests")

    assert response.status_code == 200
    rows = response.json()
    assert rows[0]["id"] == request_id
    assert rows[0]["status"] == "pending"
    assert rows[0]["use_count"] == 0
    assert rows[0]["code"] is None


def test_admin_request_list_shows_code_after_approve(resume_client):
    request_id = submit(resume_client).json()["id"]
    admin_login(resume_client)
    code = approve_and_get_code(resume_client, request_id)

    rows = resume_client.get("/api/admin/requests").json()

    assert rows[0]["code"] == code
    assert rows[0]["status"] == "approved"
    assert rows[0]["expires_at"]


def test_admin_login_locks_after_repeated_failures(resume_client):
    for _ in range(5):
        assert resume_client.post("/api/admin/login", json={"token": "wrong"}).status_code == 403

    assert resume_client.post("/api/admin/login", json={"token": "wrong"}).status_code == 429


def test_approve_then_unlock_reads_resume_and_pdf(resume_client):
    request_id = submit(resume_client).json()["id"]
    assert admin_login(resume_client).status_code == 200
    code = approve_and_get_code(resume_client, request_id)

    assert len(code) == 8
    assert "胡筱漫的简历正文" not in resume_client.get("/resume.html").text

    unlock = resume_client.post("/api/resume/unlock", json={"code": code})

    assert unlock.status_code == 200
    page = resume_client.get("/resume.html")
    assert "胡筱漫的简历正文" in page.text
    assert page.headers["cache-control"] == "no-store"

    pdf = resume_client.get("/assets/pdf/resume.pdf")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert pdf.headers["cache-control"] == "no-store"


def test_access_status_reflects_unlock(resume_client):
    assert resume_client.get("/api/resume/access").json()["allowed"] is False

    request_id = submit(resume_client).json()["id"]
    admin_login(resume_client)
    code = approve_and_get_code(resume_client, request_id)
    resume_client.post("/api/resume/unlock", json={"code": code})

    assert resume_client.get("/api/resume/access").json()["allowed"] is True


def test_direct_link_sets_cookie_and_redirects(resume_client):
    request_id = submit(resume_client).json()["id"]
    admin_login(resume_client)
    code = approve_and_get_code(resume_client, request_id)
    resume_client.post("/api/admin/logout")

    response = resume_client.get(f"/resume.html?code={code}", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"] == "/resume.html"
    assert "胡筱漫的简历正文" in resume_client.get("/resume.html").text


def test_invalid_code_falls_back_to_gate_with_message(resume_client):
    response = resume_client.get("/resume.html?code=NOPE1234")

    assert response.status_code == 200
    assert "访问码无效" in response.text
    assert "胡筱漫的简历正文" not in response.text


def test_revoke_invalidates_access_immediately(resume_client):
    request_id = submit(resume_client).json()["id"]
    admin_login(resume_client)
    code = approve_and_get_code(resume_client, request_id)
    resume_client.post("/api/resume/unlock", json={"code": code})
    assert "胡筱漫的简历正文" in resume_client.get("/resume.html").text

    revoke = resume_client.post(f"/api/admin/codes/{code}/revoke")

    assert revoke.status_code == 200
    assert "胡筱漫的简历正文" not in resume_client.get("/resume.html").text
    assert resume_client.get("/assets/pdf/resume.pdf").status_code == 403


def test_expired_code_is_rejected(resume_client, resume_settings):
    request_id = submit(resume_client).json()["id"]
    admin_login(resume_client)
    code = approve_and_get_code(resume_client, request_id)

    past = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    with session(resume_settings.resume_db, RESUME_TABLES) as conn:
        conn.execute("UPDATE resume_codes SET expires_at = ? WHERE code = ?", (past, code))

    assert resume_client.post("/api/resume/unlock", json={"code": code}).status_code == 403


def test_reject_marks_request_and_blocks_code(resume_client):
    request_id = submit(resume_client).json()["id"]
    admin_login(resume_client)
    code = approve_and_get_code(resume_client, request_id)

    rejected = resume_client.post(f"/api/admin/requests/{request_id}/reject")

    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert resume_client.post("/api/resume/unlock", json={"code": code}).status_code == 403


def test_admin_disabled_without_token(resume_settings, resume_client):
    import dataclasses

    from fastapi.testclient import TestClient

    from app.main import create_app

    settings = dataclasses.replace(resume_settings, admin_token="")
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/admin/requests").status_code == 403
        assert client.post("/api/admin/login", json={"token": "whatever"}).status_code == 403

"""测试夹具：数据文件与留言数据库都指向临时目录，不会污染 api/data。"""

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# 允许直接以 `pytest` 方式运行（不依赖 pytest.ini 的 pythonpath 设置）
API_DIR = Path(__file__).resolve().parents[1]
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from app.core.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402
from app.routers.admin import login_guard  # noqa: E402
from app.routers.resume import request_limiter, unlock_limiter  # noqa: E402

SITE_DIR = API_DIR.parent / "aurora-site"
ADMIN_TOKEN = "test-admin-token"


@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    """限流器是进程内的，测试之间必须清空，否则会互相影响。"""
    request_limiter.clear()
    unlock_limiter.clear()
    login_guard.clear()
    yield


@pytest.fixture
def projects_file(tmp_path: Path) -> Path:
    """项目列表数据文件，默认不存在，由用例按需写入。"""
    return tmp_path / "projects.json"


@pytest.fixture
def settings(tmp_path: Path, projects_file: Path) -> Settings:
    return Settings(
        projects_file=projects_file,
        messages_db=tmp_path / "messages.db",
        static_dir=SITE_DIR,
        cors_origins=[],
        messages_limit=50,
    )


@pytest.fixture
def app(settings: Settings):
    return create_app(settings)


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def resume_settings(tmp_path: Path, settings: Settings) -> Settings:
    """受保护简历相关的配置：文件与数据库都指向临时目录。"""
    import dataclasses

    html_file = tmp_path / "resume.html"
    html_file.write_text("<html><body>胡筱漫的简历正文</body></html>", encoding="utf-8")
    pdf_file = tmp_path / "resume.pdf"
    pdf_file.write_bytes(b"%PDF-1.4 fake resume")

    return dataclasses.replace(
        settings,
        resume_html=html_file,
        resume_pdf=pdf_file,
        resume_db=tmp_path / "resume.db",
        resume_days=30,
        admin_token=ADMIN_TOKEN,
    )


@pytest.fixture
def resume_client(resume_settings: Settings):
    with TestClient(create_app(resume_settings)) as test_client:
        yield test_client

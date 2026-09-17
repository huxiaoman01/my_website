"""静态站点挂载、健康检查、CORS 开关与环境变量解析。"""

import dataclasses
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def test_health(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_index_page_is_served(client):
    response = client.get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Aurora" in response.text


def test_frontend_assets_are_served(client):
    assert client.get("/css/style.css").status_code == 200
    assert client.get("/js/main.js").status_code == 200
    assert client.get("/assets/images/favicon.svg").status_code == 200


def test_unknown_path_returns_404(client):
    assert client.get("/no-such-page").status_code == 404


def test_missing_static_dir_keeps_api_usable(settings, tmp_path: Path):
    without_site = dataclasses.replace(settings, static_dir=tmp_path / "no-site")

    with TestClient(create_app(without_site)) as client:
        assert client.get("/api/health").status_code == 200
        assert client.get("/").status_code == 404


def test_cors_disabled_by_default(client):
    response = client.get("/api/health", headers={"Origin": "http://127.0.0.1:5500"})

    assert "access-control-allow-origin" not in response.headers


def test_cors_enabled_when_origins_configured(settings):
    configured = dataclasses.replace(settings, cors_origins=["http://127.0.0.1:5500"])

    with TestClient(create_app(configured)) as client:
        response = client.get("/api/health", headers={"Origin": "http://127.0.0.1:5500"})

    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5500"


def test_settings_read_from_env(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("AURORA_PROJECTS_FILE", str(tmp_path / "p.json"))
    monkeypatch.setenv("AURORA_MESSAGES_DB", str(tmp_path / "m.db"))
    monkeypatch.setenv("AURORA_STATIC_DIR", str(tmp_path / "site"))
    monkeypatch.setenv("AURORA_CORS_ORIGINS", "http://127.0.0.1:5500, http://localhost:5500/")
    monkeypatch.setenv("AURORA_MESSAGES_LIMIT", "10")

    settings = Settings.from_env()

    assert settings.projects_file == (tmp_path / "p.json").resolve()
    assert settings.messages_db == (tmp_path / "m.db").resolve()
    assert settings.static_dir == (tmp_path / "site").resolve()
    assert settings.messages_limit == 10
    assert settings.cors_origins == ["http://127.0.0.1:5500", "http://localhost:5500"]

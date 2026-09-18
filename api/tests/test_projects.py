"""项目接口：正常读写、单条查询，以及数据非法时的 500 详情。"""

import json
from pathlib import Path

import pytest

VALID_PROJECT = {
    "id": "demo-project",
    "title": "示例项目",
    "summary": "用于测试的项目条目。",
    "tags": ["Python", "FastAPI"],
    "link": "",
    "year": 2025,
}

VALID_DETAIL = {
    "role": "数据挖掘与分析成员",
    "period": "2025.07 - 至今",
    "stack": ["Python", "Pandas"],
    "metrics": [{"label": "用户行为数据", "value": "1 万+"}],
    "sections": [
        {
            "heading": "项目背景",
            "paragraphs": ["用于测试的项目背景。"],
            "bullets": ["要点一", "要点二"],
        }
    ],
    "links": [{"label": "查看成果看板", "href": "assets/dashboards/messages-dashboard.html"}],
}


def write_projects(projects_file: Path, payload: object) -> None:
    projects_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def test_list_returns_all_entries(client, projects_file):
    write_projects(projects_file, [VALID_PROJECT, {**VALID_PROJECT, "id": "second-project"}])

    response = client.get("/api/projects")

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == ["demo-project", "second-project"]


def test_missing_file_returns_empty_list(client):
    response = client.get("/api/projects")

    assert response.status_code == 200
    assert response.json() == []


def test_get_project_by_id(client, projects_file):
    write_projects(projects_file, [VALID_PROJECT])

    response = client.get("/api/projects/demo-project")

    assert response.status_code == 200
    assert response.json()["title"] == "示例项目"


def test_unknown_project_returns_404(client, projects_file):
    write_projects(projects_file, [VALID_PROJECT])

    response = client.get("/api/projects/not-exist")

    assert response.status_code == 404
    assert response.json()["detail"] == "project not found"


@pytest.mark.parametrize(
    "invalid_entry",
    [
        {"title": "缺少 id", "summary": "内容"},
        {**VALID_PROJECT, "id": "Demo Project"},
        {**VALID_PROJECT, "title": ""},
        {**VALID_PROJECT, "year": 1999},
        {**VALID_PROJECT, "tags": [""]},
        {**VALID_PROJECT, "link": "ftp://example.com"},
        {**VALID_PROJECT, "link": "javascript:alert(1)"},
        {**VALID_PROJECT, "link": "//evil.example.com"},
        {**VALID_PROJECT, "link": "../../etc/passwd"},
        {**VALID_PROJECT, "link": "assets/../secret.txt"},
        {**VALID_PROJECT, "link": "images/avatar.jpg"},
    ],
)
def test_invalid_entry_returns_500_with_errors(client, projects_file, invalid_entry):
    write_projects(projects_file, [invalid_entry])

    response = client.get("/api/projects")

    assert response.status_code == 500
    detail = response.json()["detail"]
    assert detail["message"] == "projects.json validation failed"
    assert detail["errors"]


def test_duplicate_ids_are_reported(client, projects_file):
    write_projects(projects_file, [VALID_PROJECT, {**VALID_PROJECT, "title": "重复 id"}])

    response = client.get("/api/projects")

    assert response.status_code == 500
    assert response.json()["detail"]["duplicate_ids"] == ["demo-project"]


@pytest.mark.parametrize(
    "link",
    ["assets/dashboards/messages-dashboard.html", "/assets/images/avatar.jpg"],
)
def test_site_relative_links_are_accepted(client, projects_file, link):
    write_projects(projects_file, [{**VALID_PROJECT, "link": link}])

    response = client.get("/api/projects")

    assert response.status_code == 200
    assert response.json()[0]["link"] == link


def test_malformed_json_returns_500(client, projects_file):
    projects_file.write_text("{ 这不是 JSON", encoding="utf-8")

    response = client.get("/api/projects")

    assert response.status_code == 500
    assert "JSON" in response.json()["detail"]["message"]


def test_list_response_does_not_include_detail(client, projects_file):
    write_projects(projects_file, [{**VALID_PROJECT, "detail": VALID_DETAIL}])

    response = client.get("/api/projects")

    assert response.status_code == 200
    assert "detail" not in response.json()[0]


def test_single_project_includes_detail(client, projects_file):
    write_projects(projects_file, [{**VALID_PROJECT, "detail": VALID_DETAIL}])

    response = client.get("/api/projects/demo-project")

    assert response.status_code == 200
    detail = response.json()["detail"]
    assert detail["role"] == "数据挖掘与分析成员"
    assert detail["metrics"] == [{"label": "用户行为数据", "value": "1 万+"}]
    assert detail["sections"][0]["heading"] == "项目背景"
    assert detail["sections"][0]["bullets"] == ["要点一", "要点二"]
    assert detail["links"][0]["href"] == "assets/dashboards/messages-dashboard.html"


def test_single_project_without_detail_returns_null(client, projects_file):
    write_projects(projects_file, [VALID_PROJECT])

    response = client.get("/api/projects/demo-project")

    assert response.status_code == 200
    assert response.json()["detail"] is None


@pytest.mark.parametrize(
    "invalid_detail",
    [
        {"metrics": [{"value": "缺少 label"}]},
        {"sections": [{"heading": "超长段落", "paragraphs": ["内" * 601]}]},
        {"links": [{"label": "危险链接", "href": "javascript:alert(1)"}]},
        {"links": [{"label": "空链接", "href": "   "}]},
        {"sections": [{"heading": f"章节 {i}"} for i in range(9)]},
        {"stack": [""]},
        {"role": "角" * 61},
    ],
)
def test_invalid_detail_returns_500_with_errors(client, projects_file, invalid_detail):
    write_projects(projects_file, [{**VALID_PROJECT, "detail": invalid_detail}])

    response = client.get("/api/projects")

    assert response.status_code == 500
    assert response.json()["detail"]["errors"]

"""留言接口：空列表、写入与读取、字段校验、条数上限。"""

import dataclasses

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def post_message(client, name: str, content: str):
    return client.post("/api/messages", json={"name": name, "content": content})


def test_messages_start_empty(client):
    response = client.get("/api/messages")

    assert response.status_code == 200
    assert response.json() == []


def test_created_message_is_listed(client):
    created = post_message(client, "Aurora", "欢迎来到留言板。")

    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Aurora"
    assert body["content"] == "欢迎来到留言板。"
    assert body["created_at"]

    listed = client.get("/api/messages").json()
    assert [item["id"] for item in listed] == [body["id"]]
    assert listed[0]["content"] == "欢迎来到留言板。"


def test_newest_message_comes_first(client):
    ids = [post_message(client, f"访客{i}", f"第 {i} 条").json()["id"] for i in range(1, 4)]

    listed = client.get("/api/messages").json()

    assert [item["id"] for item in listed] == list(reversed(ids))


def test_whitespace_is_trimmed(client):
    body = post_message(client, "  Aurora  ", "  你好  ").json()

    assert body["name"] == "Aurora"
    assert body["content"] == "你好"


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "content": "内容"},
        {"name": "Aurora", "content": "   "},
        {"name": "A" * 21, "content": "内容"},
        {"name": "Aurora", "content": "内" * 301},
        {"name": "Aurora"},
    ],
)
def test_invalid_payload_returns_400(client, payload):
    response = client.post("/api/messages", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "request validation failed"
    assert response.json()["errors"]


def test_message_limit_comes_from_settings(settings):
    limited_settings = dataclasses.replace(settings, messages_limit=2)

    with TestClient(create_app(limited_settings)) as client:
        ids = [post_message(client, f"访客{i}", f"第 {i} 条").json()["id"] for i in range(1, 4)]
        listed = client.get("/api/messages").json()

    assert [item["id"] for item in listed] == [ids[2], ids[1]]

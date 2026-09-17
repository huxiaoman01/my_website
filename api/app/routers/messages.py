"""留言板接口：SQLite 持久化，写入前由 Pydantic 校验空值与长度。"""

from datetime import datetime, timezone

from fastapi import APIRouter, Request

from ..db import session
from ..schemas import Message, MessageCreate

router = APIRouter(prefix="/api", tags=["messages"])


@router.get("/messages", response_model=list[Message], summary="最近留言列表")
def list_messages(request: Request) -> list[Message]:
    settings = request.app.state.settings
    with session(settings.messages_db) as conn:
        rows = conn.execute(
            """
            SELECT id, name, content, created_at
            FROM messages
            ORDER BY created_at DESC, id DESC
            LIMIT ?
            """,
            (settings.messages_limit,),
        ).fetchall()
    return [dict(row) for row in rows]


@router.post("/messages", response_model=Message, status_code=201, summary="发布留言")
def create_message(message: MessageCreate, request: Request) -> Message:
    settings = request.app.state.settings
    created_at = datetime.now(timezone.utc).isoformat()

    with session(settings.messages_db) as conn:
        cursor = conn.execute(
            """
            INSERT INTO messages (name, content, created_at)
            VALUES (?, ?, ?)
            """,
            (message.name, message.content, created_at),
        )
        message_id = cursor.lastrowid

    return Message(
        id=message_id,
        name=message.name,
        content=message.content,
        created_at=created_at,
    )

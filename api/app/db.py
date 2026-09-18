"""SQLite 连接与建表：表结构在每次建立连接时按需创建。"""

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

CREATE_MESSAGES_TABLE = """
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
)
"""

CREATE_RESUME_REQUESTS_TABLE = """
CREATE TABLE IF NOT EXISTS resume_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    reviewed_at TEXT
)
"""

CREATE_RESUME_CODES_TABLE = """
CREATE TABLE IF NOT EXISTS resume_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    last_used_at TEXT,
    use_count INTEGER NOT NULL DEFAULT 0
)
"""

MESSAGE_TABLES = (CREATE_MESSAGES_TABLE,)
RESUME_TABLES = (CREATE_RESUME_REQUESTS_TABLE, CREATE_RESUME_CODES_TABLE)


@contextmanager
def session(
    db_path: Path,
    statements: tuple[str, ...] = MESSAGE_TABLES,
) -> Iterator[sqlite3.Connection]:
    """打开数据库连接，正常退出时提交，异常时回滚，最后统一关闭。"""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        for statement in statements:
            conn.execute(statement)
        yield conn
        conn.commit()
    finally:
        conn.close()

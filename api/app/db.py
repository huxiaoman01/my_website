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


@contextmanager
def session(db_path: Path) -> Iterator[sqlite3.Connection]:
    """打开数据库连接，正常退出时提交，异常时回滚，最后统一关闭。"""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute(CREATE_MESSAGES_TABLE)
        yield conn
        conn.commit()
    finally:
        conn.close()

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import TypeAdapter, ValidationError

from schemas import Message, MessageCreate, Project

# 本文件所在目录下的 data/projects.json
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PROJECTS_FILE = DATA_DIR / "projects.json"
MESSAGES_DB = DATA_DIR / "messages.db"

project_list_adapter = TypeAdapter(list[Project])

app = FastAPI(
    title="Aurora Site API",
    description="个人网站后端示例（FastAPI）",
    version="0.1.0",
)


# ---------- CORS：开发阶段放宽；上线改为你的真实前端域名 ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://124.222.53.145",
        "http://124.222.53.145:5500",
        "http://124.222.53.145:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
def validation_exception_handler(request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        cleaned = dict(error)
        if "ctx" in cleaned:
            cleaned["ctx"] = {key: str(value) for key, value in cleaned["ctx"].items()}
        errors.append(cleaned)

    return JSONResponse(
        status_code=400,
        content={"detail": "request validation failed", "errors": errors},
    )


def get_db_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(MESSAGES_DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_messages_db() -> None:
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


init_messages_db()


def load_projects() -> list[Project]:
    if not PROJECTS_FILE.is_file():
        return []

    with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
        raw = json.load(f)

    try:
        projects = project_list_adapter.validate_python(raw)
    except ValidationError as exc:
        raise HTTPException(
            status_code=500,
            detail={"message": "projects.json validation failed", "errors": exc.errors()},
        ) from exc

    ids = [project.id for project in projects]
    duplicate_ids = sorted({project_id for project_id in ids if ids.count(project_id) > 1})
    if duplicate_ids:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "projects.json contains duplicate id(s)",
                "duplicate_ids": duplicate_ids,
            },
        )

    return projects


@app.get("/api/health")
def health():
    return {"ok": True, "service": "aurora-api"}


@app.get("/api/projects", response_model=list[Project])
def list_projects():
    return load_projects()


@app.get("/api/projects/{project_id}", response_model=Project)
def get_project(project_id: str):
    for project in load_projects():
        if project.id == project_id:
            return project
    raise HTTPException(status_code=404, detail="project not found")


@app.get("/api/messages", response_model=list[Message])
def list_messages():
    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, name, content, created_at
            FROM messages
            ORDER BY created_at DESC, id DESC
            LIMIT 50
            """
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/messages", response_model=Message, status_code=201)
def create_message(message: MessageCreate):
    created_at = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO messages (name, content, created_at)
            VALUES (?, ?, ?)
            """,
            (message.name, message.content, created_at),
        )
        message_id = cursor.lastrowid

    return {
        "id": message_id,
        "name": message.name,
        "content": message.content,
        "created_at": created_at,
    }

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# 本文件所在目录下的 data/projects.json
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PROJECTS_FILE = DATA_DIR / "projects.json"

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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_projects():
    if not PROJECTS_FILE.is_file():
        return []
    with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/health")
def health():
    return {"ok": True, "service": "aurora-api"}


@app.get("/api/projects")
def list_projects():
    return load_projects()


@app.get("/api/projects/{project_id}")
def get_project(project_id: str):
    for item in load_projects():
        if item.get("id") == project_id:
            return item
    raise HTTPException(status_code=404, detail="project not found")
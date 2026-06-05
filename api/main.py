import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import TypeAdapter, ValidationError

from schemas import Project

# 本文件所在目录下的 data/projects.json
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PROJECTS_FILE = DATA_DIR / "projects.json"

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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

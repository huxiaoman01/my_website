"""项目列表接口：数据源为 data/projects.json，读取后逐条做 Pydantic 校验。"""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import TypeAdapter, ValidationError

from ..schemas import Project

router = APIRouter(prefix="/api", tags=["projects"])

_project_list_adapter = TypeAdapter(list[Project])


def load_projects(projects_file: Path) -> list[Project]:
    """读取并校验项目列表：文件缺失返回空数组，数据非法返回 500 及错误详情。"""
    if not projects_file.is_file():
        return []

    try:
        raw = json.loads(projects_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail={"message": "projects.json is not valid JSON", "errors": [str(exc)]},
        ) from exc

    try:
        projects = _project_list_adapter.validate_python(raw)
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


@router.get("/projects", response_model=list[Project], summary="项目列表")
def list_projects(request: Request) -> list[Project]:
    return load_projects(request.app.state.settings.projects_file)


@router.get("/projects/{project_id}", response_model=Project, summary="按 id 查询单个项目")
def get_project(project_id: str, request: Request) -> Project:
    for project in load_projects(request.app.state.settings.projects_file):
        if project.id == project_id:
            return project
    raise HTTPException(status_code=404, detail="project not found")

"""项目列表接口：数据源为 data/projects.json，读取后逐条做 Pydantic 校验。"""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import TypeAdapter, ValidationError

from ..schemas import Project, ProjectWithDetail

router = APIRouter(prefix="/api", tags=["projects"])

_project_list_adapter = TypeAdapter(list[ProjectWithDetail])


def _serializable_errors(exc: ValidationError) -> list[dict]:
    """把 ctx 里的异常对象转成字符串，保证错误详情能被 JSON 序列化。"""
    errors = []
    for error in exc.errors():
        cleaned = dict(error)
        if "ctx" in cleaned:
            cleaned["ctx"] = {key: str(value) for key, value in cleaned["ctx"].items()}
        errors.append(cleaned)
    return errors


def load_projects(projects_file: Path) -> list[ProjectWithDetail]:
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
            detail={
                "message": "projects.json validation failed",
                "errors": _serializable_errors(exc),
            },
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
def list_projects(request: Request) -> list[ProjectWithDetail]:
    """列表只返回卡片需要的字段，detail 由响应模型自动裁剪掉。"""
    return load_projects(request.app.state.settings.projects_file)


@router.get("/projects/{project_id}", response_model=ProjectWithDetail, summary="按 id 查询单个项目")
def get_project(project_id: str, request: Request) -> ProjectWithDetail:
    for project in load_projects(request.app.state.settings.projects_file):
        if project.id == project_id:
            return project
    raise HTTPException(status_code=404, detail="project not found")

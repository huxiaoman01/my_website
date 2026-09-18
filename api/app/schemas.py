import re
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

_ID_PATTERN = re.compile(r"^[a-z0-9-]+$")


def _clean_link(value: str) -> str:
    """外链必须是 http(s)；站内链接只允许指向 assets/ 下的资源。"""
    trimmed = value.strip()
    if not trimmed:
        return ""
    if trimmed.startswith(("http://", "https://")):
        return trimmed
    if trimmed.startswith("//") or ":" in trimmed or "\\" in trimmed or ".." in trimmed:
        raise ValueError("link must be an http(s) URL or a site-relative assets path")
    if not trimmed.startswith(("assets/", "/assets/")):
        raise ValueError("site-relative link must point into assets/")
    return trimmed


class Project(BaseModel):
    id: Annotated[str, Field(min_length=1, pattern=_ID_PATTERN.pattern)]
    title: Annotated[str, Field(min_length=1, max_length=80)]
    summary: Annotated[str, Field(min_length=1, max_length=500)]
    tags: list[str] = Field(default_factory=list)
    link: str = ""
    year: int | None = Field(default=None, ge=2000, le=2100)

    @field_validator("tags")
    @classmethod
    def tags_must_be_non_empty_strings(cls, value: list[str]) -> list[str]:
        cleaned = [tag.strip() for tag in value if tag.strip()]
        if len(cleaned) != len(value):
            raise ValueError("tags must be non-empty strings")
        return cleaned

    @field_validator("link")
    @classmethod
    def link_must_be_http_or_asset_path(cls, value: str) -> str:
        return _clean_link(value)


class ProjectMetric(BaseModel):
    label: Annotated[str, Field(min_length=1, max_length=20)]
    value: Annotated[str, Field(min_length=1, max_length=20)]


class ProjectSection(BaseModel):
    heading: Annotated[str, Field(min_length=1, max_length=40)]
    paragraphs: list[Annotated[str, Field(min_length=1, max_length=600)]] = Field(
        default_factory=list, max_length=6
    )
    bullets: list[Annotated[str, Field(min_length=1, max_length=300)]] = Field(
        default_factory=list, max_length=10
    )


class ProjectLink(BaseModel):
    label: Annotated[str, Field(min_length=1, max_length=30)]
    href: Annotated[str, Field(min_length=1)]

    @field_validator("href")
    @classmethod
    def href_must_be_safe(cls, value: str) -> str:
        cleaned = _clean_link(value)
        if not cleaned:
            raise ValueError("href cannot be empty")
        return cleaned


class ProjectDetail(BaseModel):
    """项目详情页的扩展内容，缺失时详情页降级为简介。"""

    role: Annotated[str, Field(max_length=60)] = ""
    period: Annotated[str, Field(max_length=60)] = ""
    stack: list[str] = Field(default_factory=list, max_length=20)
    metrics: list[ProjectMetric] = Field(default_factory=list, max_length=6)
    sections: list[ProjectSection] = Field(default_factory=list, max_length=8)
    links: list[ProjectLink] = Field(default_factory=list, max_length=5)

    @field_validator("stack")
    @classmethod
    def stack_must_be_non_empty_strings(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item.strip()]
        if len(cleaned) != len(value):
            raise ValueError("stack must be non-empty strings")
        return cleaned


class ProjectWithDetail(Project):
    """单条项目查询的响应模型：Project 加上可选的 detail。"""

    detail: ProjectDetail | None = None


class MessageCreate(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=20)]
    content: Annotated[str, Field(min_length=1, max_length=300)]

    @field_validator("name", "content")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("field cannot be empty")
        return trimmed


class Message(MessageCreate):
    id: int
    created_at: datetime

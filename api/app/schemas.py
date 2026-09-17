import re
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

_ID_PATTERN = re.compile(r"^[a-z0-9-]+$")


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
    def link_must_be_http_or_empty(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            return ""
        if not trimmed.startswith(("http://", "https://")):
            raise ValueError("link must start with http:// or https:// when provided")
        return trimmed


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

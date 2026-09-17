"""运行期配置。

全部通过环境变量覆盖，未设置时回退到仓库内的默认路径：

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `AURORA_PROJECTS_FILE` | `api/data/projects.json` | 项目列表数据源 |
| `AURORA_MESSAGES_DB` | `api/data/messages.db` | 留言 SQLite 文件 |
| `AURORA_STATIC_DIR` | `aurora-site/` | 前端静态站点目录 |
| `AURORA_CORS_ORIGINS` | 空 | 逗号分隔的来源白名单，为空时不启用 CORS |
| `AURORA_MESSAGES_LIMIT` | `50` | `/api/messages` 单次返回的留言条数上限 |
"""

import os
from dataclasses import dataclass
from pathlib import Path

# 本文件位于 api/app/core/config.py
API_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = API_DIR.parent

DEFAULT_PROJECTS_FILE = API_DIR / "data" / "projects.json"
DEFAULT_MESSAGES_DB = API_DIR / "data" / "messages.db"
DEFAULT_STATIC_DIR = REPO_ROOT / "aurora-site"
DEFAULT_MESSAGES_LIMIT = 50


def _env_path(name: str, default: Path) -> Path:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    return Path(raw).expanduser().resolve()


def _env_origins(name: str) -> list[str]:
    raw = os.getenv(name, "")
    return [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ValueError(f"{name} 必须是整数，当前值：{raw!r}") from exc


@dataclass(frozen=True)
class Settings:
    """一次应用启动所需的全部配置。"""

    projects_file: Path
    messages_db: Path
    static_dir: Path
    cors_origins: list[str]
    messages_limit: int

    @classmethod
    def from_env(cls) -> "Settings":
        limit = _env_int("AURORA_MESSAGES_LIMIT", DEFAULT_MESSAGES_LIMIT)
        if limit < 1:
            raise ValueError("AURORA_MESSAGES_LIMIT 必须大于等于 1")

        return cls(
            projects_file=_env_path("AURORA_PROJECTS_FILE", DEFAULT_PROJECTS_FILE),
            messages_db=_env_path("AURORA_MESSAGES_DB", DEFAULT_MESSAGES_DB),
            static_dir=_env_path("AURORA_STATIC_DIR", DEFAULT_STATIC_DIR),
            cors_origins=_env_origins("AURORA_CORS_ORIGINS"),
            messages_limit=limit,
        )

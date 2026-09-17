"""应用装配：API 路由、静态站点挂载与按需启用 CORS。

本地开发一个进程即可同时提供页面与接口：

    cd api
    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

浏览器访问 http://127.0.0.1:8000/ 即可；生产环境由 Nginx 托管静态文件并反代 /api。
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .core.config import Settings
from .routers import messages, projects


def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """把请求体校验错误统一成 400 + detail/errors，便于前端直接展示。"""
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


def create_app(settings: Settings | None = None) -> FastAPI:
    """按传入配置或环境变量构建应用实例。"""
    settings = settings or Settings.from_env()

    app = FastAPI(
        title="Aurora Site API",
        description="个人网站后端示例（FastAPI）",
        version="0.2.0",
    )
    app.state.settings = settings

    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    # 前后端同源时无需 CORS，仅在 AURORA_CORS_ORIGINS 显式配置时启用。
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.include_router(projects.router)
    app.include_router(messages.router)

    @app.get("/api/health", tags=["health"], summary="健康检查")
    def health() -> dict[str, object]:
        return {"ok": True, "service": "aurora-api"}

    # 静态站点最后挂载：/api、/docs、/openapi.json 等路由优先生效。
    if settings.static_dir.is_dir():
        app.mount("/", StaticFiles(directory=str(settings.static_dir), html=True), name="site")

    return app


app = create_app()

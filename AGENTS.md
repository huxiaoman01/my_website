# AGENTS.md

本文件是本仓库的工作约定，供 AI 代理与协作者参考。动手前请先读完。

## 项目形态

- 前后端分离的个人站：`aurora-site/` 是纯静态前端（原生 HTML/CSS/ES modules，**无构建工具**），`api/` 是 FastAPI 后端。
- 前后端**同源**：本地由 FastAPI 挂载 `aurora-site/` 并同时提供 `/api`；生产由 Nginx 托管静态文件、把 `/api` 反代到 127.0.0.1:8000。
- 生产环境：Ubuntu 24.04，代码在 `/home/ubuntu/my_website`，服务为 systemd 单元 `aurora-api.service`，Nginx 站点名为 `aurora`。

## 常用命令

| 目的 | 命令 |
|------|------|
| 启动本地服务（页面 + API 同源） | `cd api` 后 `python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` |
| 访问站点 / 接口文档 | http://127.0.0.1:8000/ 、http://127.0.0.1:8000/docs |
| 运行测试 | `cd api` 后 `python -m pytest` |
| 安装依赖 | `pip install -r requirements.txt`；跑测试再装 `requirements-dev.txt` |
| 同步到服务器 | 服务器上 `cd /home/ubuntu/my_website && git pull --ff-only`，仅当改动在 `api/` 下才需要 `sudo systemctl restart aurora-api` |

Windows 下用 `api\.venv\Scripts\python.exe` 调用；`pytest` 需要写系统临时目录，若报 `PermissionError` 请在普通终端（非受限沙箱）中运行。

## 接口与配置

- 前端只请求相对路径 `/api`（见 `aurora-site/js/api.js` 的 `API_BASE`），**不要硬编码主机、端口或 IP**；只有前端独立部署时才用 `window.AURORA_API_BASE` 覆盖。
- 后端默认不启用 CORS，仅在显式设置 `AURORA_CORS_ORIGINS` 时按白名单开放；不要恢复代码里写死的来源列表。
- 路径、端口、条数上限统一走 `api/app/core/config.py` 的 `AURORA_*` 环境变量，新增配置项要同步 README 的环境变量表。
- 路由放 `api/app/routers/`，Pydantic 模型放 `api/app/schemas.py`，装配只在 `create_app()` 内完成；顺序是先 `include_router`，最后 `app.mount("/", StaticFiles(...))`，否则会盖住 `/api` 与 `/docs`。
- 保持现有错误语义：`projects.json` 非法或 `id` 重复 → 500 且 `detail.errors` / `detail.duplicate_ids`；请求体校验失败 → 400 且 `detail` / `errors`；单条查询不存在 → 404。

## 数据

- `api/data/projects.json` 是项目卡片的唯一数据源（字段规则见 README，`id` 为小写字母、数字、连字符且列表内唯一）。
- `api/data/messages.db` 是运行期生成的留言库，**不提交、不在服务器上手改**；测试必须用 `tmp_path` 隔离，禁止写入 `api/data`。

## 前端

- 模块职责固定：`main.js`（首页装配）/ `subpage.js`（子页面装配）只做装配；`api.js` 负责请求与错误解析；`stars.js`（星空与流星）/ `bubbles.js`（亮色泡泡）/ `cursor.js`（光标粒子）/ `theme.js` / `projects.js`（首页卡片）/ `project-detail.js`（详情页渲染）/ `guestbook.js` / `ui.js` 各管一块。模块之间只通过 `export` 通信，禁止跨模块查询对方 DOM。
- 页面结构：`index.html`（首页）、`project.html`（详情页，读取 `?id=`）、`resume.html`（在线简历，可打印且不放手机号）。子页面不加载光标粒子、流星雨与留言板。
- 特效分主题：暗色是星空 + 流星雨 + 跟随光标的星尘，亮色是淡蓝天空 + 泡泡 + 跟随光标的花瓣。新增动效要走 `#fx-layer` 或 `#stars-container`，并保持 `pointer-events: none` 与 `prefers-reduced-motion` 降级。
- 样式只写在 `aurora-site/css/style.css`，沿用现有 CSS 变量与 `--transition-time`；新增配色必须同时适配 `:root` 与 `.light-theme`。
- 保持无障碍与降级：加载区域用 `aria-live` / `aria-busy`；动效遵循 `prefers-reduced-motion`；后端不可用时对应区块显示可操作的提示，且不影响其余内容；外链加 `rel="noopener noreferrer"`。
- 不引入构建工具或框架（Vite / React / Vue 等）；确有需要先与维护者确认。
- 代码注释与用户可见文案统一用中文，风格与现有文件保持一致。

## 仓库卫生

- 不要重新添加根目录的资源副本（头像、二维码、旧 `style.css`）、`*.backup` 或 `deploy.tar`；静态资源只放 `aurora-site/assets/`。
- 不提交虚拟环境、`__pycache__`、数据库文件与任何密钥（`.gitignore` 已覆盖，仍要留意）。
- Nginx 中屏蔽 `.git`、`/deploy/`、`README.md` 的 deny 规则是刻意加的，不要删除。

## 文档与提交

- 启动方式、目录结构、API 契约、环境变量发生变化时，同步更新 `README.md`。
- 改后端逻辑要补 `api/tests/` 下的用例，CI（`.github/workflows/ci.yml`）会自动运行 `python -m pytest`。
- 提交信息用中文，格式为 `类型: 摘要`（如 `修复: …`、`重构: …`、`测试: …`）；分支使用 `codex/` 前缀。

## 部署注意

- 服务器上不要直接编辑被 git 跟踪的文件（例如 `api/data/projects.json`），否则 `git pull` 会因本地修改而失败；改动一律在本地提交后拉取。
- 静态资源目前缓存 7 天，改完前端需 `Ctrl+F5` 才能看到新版。
- 本机与服务器连接 GitHub 偶发中断，可用 `git bundle` + `scp` 经 SSH 传输提交作为替代。

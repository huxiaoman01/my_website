# Aurora's World · 个人网站

信息管理专业学生的**前后端分离**个人站点：前端为纯静态页面（星空主题、动效与响应式布局），后端为 FastAPI REST 接口。主页「我的项目」区块在页面加载时先显示**骨架屏占位**，再请求 `GET /api/projects`，将经 Pydantic 校验的 `api/data/projects.json` 动态渲染为卡片列表——后端未启动、跨域不匹配或 JSON 非法时，该区域显示友好错误提示，其余页面仍可用。

> 仓库地址：[github.com/huxiaoman01](https://github.com/huxiaoman01)

---

## 项目概览

| 维度 | 说明 |
|------|------|
| **定位** | 个人品牌展示 + 前后端联调练习 |
| **前端** | `aurora-site/` — HTML / CSS / 原生 JavaScript，无构建工具 |
| **后端** | `api/` — FastAPI + Uvicorn，JSON 文件作数据源 |
| **联调方式** | 前端 `5500` 端口 + API `8000` 端口，`fetch` + CORS |
| **适用场景** | 简历链接、课程作业展示、本地开发演示 |

```
浏览器 (5500)
    │  fetch GET /api/projects
    ▼
FastAPI (8000)
    │  读取
    ▼
api/data/projects.json  →  Pydantic 校验  →  骨架屏 → 动态生成项目卡片
```

---

## 技术亮点（体现功底的部分）

### 前端 · 视觉与交互

- **CSS 变量 + 双主题**：`:root` 与 `.light-theme` 统一管理配色；切换主题时背景、卡片、星星等全局过渡，而非硬编码两套样式。
- **星空动效系统**：JS 动态生成 150 颗星星（随机大小、位置、透明度、动画时长）；定时器驱动流星；「小惊喜」按钮可批量触发流星雨，动画结束后 DOM 自动清理，避免内存泄漏。
- **ThemeManager 类**：封装主题切换逻辑——`localStorage` 持久化偏好、监听 `prefers-color-scheme` 系统主题、联动调整星星视觉强度。
- **打字机 + 光标闪烁**：昵称逐字输出，完成后注入闪烁光标动画。
- **玻璃拟态布局**：`backdrop-filter: blur`、渐变边框头像框、卡片 hover 微交互；768px 断点下左右栏变为上下堆叠。
- **模态框与无障碍**：微信二维码弹层支持点击遮罩关闭；项目区使用 `aria-live="polite"`、`aria-busy` 便于读屏感知加载与更新状态。
- **项目卡片骨架屏**：请求 API 前先渲染与真实卡片同布局的占位块（shimmer 动画）；桌面端 4 个、移动端 2 个；支持暗/亮主题；`prefers-reduced-motion` 时降级为静态灰块。

### 前端 · 工程意识

- **前后端分离的数据流**：`loadProjectsFromApi()` 先展示骨架屏，再异步拉取 JSON，用 `DocumentFragment` 批量插入 DOM，减少重排；最短展示 300ms，避免本地请求过快时闪烁。
- **健壮的渲染逻辑**：校验响应是否为数组；外链仅当 `http` 开头时渲染，并加 `rel="noopener noreferrer"`；失败时给出可操作的红色提示（端口、CORS、启动命令）。
- **渐进增强**：后端不可用时整站仍可浏览；只有「我的项目」区块降级，不影响关于我、技能、简历下载等。

### 后端 · API 设计

- **RESTful 路由**：`/api/health` 健康检查、`/api/projects` 列表、`/api/projects/{id}` 单条查询（404 语义正确）。
- **Pydantic 数据校验**：`schemas.py` 定义 `Project` 模型；每次请求读取 `projects.json` 后校验字段类型与格式，`id` 不可重复；非法数据返回 **500** 及具体错误路径。
- **CORS 中间件**：开发环境白名单覆盖常见本地端口（5500 / 8000 / 3000），便于联调；代码注释标明上线需收紧。
- **路径与编码规范**：`pathlib.Path` 定位数据文件；`utf-8` 读取 JSON；文件不存在时返回空数组而非崩溃。
- **OpenAPI 文档**：路由声明 `response_model=list[Project]`，Swagger / ReDoc 自动展示完整字段 schema。

### 内容与作品集整合

`projects.json` 将个人站本身、数据看板、数据库课设、大创材料、文本分析、FastAPI 接口等条目统一展示——改 JSON 即可更新主页，无需改 HTML，体现**数据驱动页面**的基本思路。

---

## 目录结构

```
my_website/
├── aurora-site/              # 前端（纯静态）
│   ├── index.html            # 页面结构，含 #projects 项目展示区
│   ├── style.css             # 主题变量、动效、响应式、项目卡片与骨架屏样式
│   ├── script.js             # 星空、主题、API 加载、交互逻辑
│   └── assets/               # 头像、微信二维码、简历 PDF 等
├── api/                      # 后端（FastAPI）
│   ├── main.py               # 路由、CORS、JSON 读取与校验
│   ├── schemas.py            # Pydantic Project 模型与字段规则
│   ├── requirements.txt
│   ├── data/
│   │   └── projects.json     # 项目列表数据源
│   └── .venv/                # 本地虚拟环境（已在 .gitignore）
└── README.md
```

---

## 环境要求

- **Python**：建议 3.11+（依赖在 3.13 下可用）
- **浏览器**：Chrome / Edge / Firefox 等现代浏览器

前端无需 Node.js；若日后引入 Vite / React 等再单独说明。

---

## 快速开始

本地联调需**同时**运行：前端静态服务（默认 **5500**）+ 后端 API（**8000**）。`script.js` 中 `API_BASE` 默认为 `http://127.0.0.1:8000`，与 `main.py` 里 CORS 允许的 `5500` 前端来源一致。

### 1. 启动后端 API

```powershell
cd api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

若 PowerShell 禁止运行脚本，可先执行（仅需一次）：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

| 说明 | 地址 |
|------|------|
| Swagger 文档 | http://127.0.0.1:8000/docs |
| ReDoc 文档 | http://127.0.0.1:8000/redoc |
| 健康检查 | http://127.0.0.1:8000/api/health |
| 项目列表 | http://127.0.0.1:8000/api/projects |

### 2. 启动前端

```powershell
cd aurora-site
python -m http.server 5500
```

浏览器访问：http://127.0.0.1:5500/

页面向下滚动即可看到 **「我的项目」**（先出现骨架屏，再加载为卡片）；侧栏 **「探索更多 → 我的项目」** 会平滑滚动到该区域。

> **注意**：直接双击 `index.html`（`file://`）时，跨域限制可能导致项目列表无法加载；联调请优先使用 `http.server 5500`。

> **改前端后要不要重启？** 静态文件（HTML / CSS / JS）保存后**刷新浏览器**即可（必要时 `Ctrl+F5` 硬刷新）；无需重启 `http.server`。后端若使用 `--reload` 启动，改 `main.py` / `schemas.py` 会自动重载；未加 `--reload` 则需手动重启 uvicorn。

---

## 前后端联动

1. 浏览器打开 `http://127.0.0.1:5500/`，执行 `script.js` 中的 `loadProjectsFromApi()`。
2. **加载态**：`#projects-grid` 先插入 2～4 个骨架卡片（`aria-busy="true"`）。
3. 请求 `GET {API_BASE}/api/projects`；后端读取并 Pydantic 校验 `projects.json`。
4. 返回 JSON 数组后，清空骨架并在 `#projects-grid` 内动态生成真实卡片（标题、简介、标签、年份、`id`、外链等）；失败或空数组则显示对应提示文案。
5. 修改展示内容：编辑 `api/data/projects.json` 后保存并刷新浏览器即可（后端 `--reload` 会重载进程；数据须符合 `schemas.py` 字段规则）。

若更换前端端口或 API 地址：同步修改 **`aurora-site/script.js` 顶部的 `API_BASE`**，并在 **`api/main.py` 的 `allow_origins`** 中加入对应来源。

---

## API 说明

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 返回服务是否正常 |
| `GET` | `/api/projects` | 返回 `data/projects.json` 中的项目数组 |
| `GET` | `/api/projects/{project_id}` | 按 `id` 返回单条；不存在则 `404` |

---

## `projects.json` 字段约定

后端通过 `api/schemas.py` 中的 `Project` 模型校验；任一条目不合法或 `id` 重复时，`GET /api/projects` 与 `GET /api/projects/{id}` 返回 **500**，响应 `detail` 中含 `errors` 或 `duplicate_ids`，便于定位问题。

| 字段 | 类型 | 校验规则 | 说明 |
|------|------|----------|------|
| `id` | 字符串 | 必填；小写字母、数字、连字符；列表内唯一 | 用于 `/api/projects/{id}` |
| `title` | 字符串 | 必填；1～80 字符 | 卡片标题 |
| `summary` | 字符串 | 必填；1～500 字符 | 卡片简介 |
| `tags` | 字符串数组 | 必填；每项为非空字符串 | 标签列表，可为 `[]` |
| `link` | 字符串 | 可选；默认 `""`；非空时必须以 `http://` 或 `https://` 开头 | 前端仅在有合法外链时显示「查看链接」 |
| `year` | 整数 | 可选；2000～2100 | 显示在卡片元信息区 |

---

## 依赖（后端）

见 `api/requirements.txt`：

- `fastapi` — Web 框架与 OpenAPI 文档
- `uvicorn[standard]` — ASGI 服务器（含热重载）

---

## 常见问题

**`uvicorn` 不是内部或外部命令** — 在已激活的 `.venv` 下使用：

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**项目区无法加载 / 控制台 `fetch` 失败** — 检查后端是否在 `127.0.0.1:8000` 运行；前端是否通过 `http://127.0.0.1:5500` 访问；防火墙是否拦截本地请求。

**CORS 错误** — 确认 `allow_origins` 包含当前页面的协议 + 主机 + 端口，并与 `API_BASE` 一致。

**接口返回 500 / 项目区无法加载** — 打开 <http://127.0.0.1:8000/docs> 试调 `GET /api/projects`，查看 `detail.errors` 中指明的条目 index 与字段；常见原因：缺少必填字段、`id` 含大写或空格、`year` 写成字符串、两条记录 `id` 相同。

**改了前端样式或脚本但页面没变化** — 确认通过 `http://127.0.0.1:5500` 访问（非 `file://`）；尝试 `Ctrl+F5` 硬刷新清除浏览器缓存。

---

## 后续可扩展方向

- 将 `projects.json` 换为 SQLite / PostgreSQL
- 新增留言、访问量等 `POST` 接口，并做鉴权或限流
- 生产部署：前端静态托管（GitHub Pages 等）+ 后端独立服务，或用 Nginx 同域反代 `/api`

---

## 许可证

个人学习 / 展示用项目；如需开源再补充具体许可证条款即可。

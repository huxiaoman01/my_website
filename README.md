# Aurora's World · 个人网站

信息管理专业学生的**前后端分离**个人站点：前端为纯静态页面（星空主题、动效与响应式布局），后端为 FastAPI REST 接口。主页「我的项目」区块在页面加载时先显示**骨架屏占位**，再请求 `GET /api/projects`，将经 Pydantic 校验的 `api/data/projects.json` 动态渲染为卡片列表；「留言板」通过 `GET/POST /api/messages` 读写 SQLite，刷新页面后留言仍会保留。后端未启动或数据非法时，对应区块显示友好错误提示，其余页面仍可用。

前端与接口**同源**：本地由 FastAPI 一并提供页面与 `/api`，生产由 Nginx 托管静态文件并把 `/api` 反代到后端，因此整站不需要处理跨域。

> 仓库地址：[github.com/huxiaoman01](https://github.com/huxiaoman01)

---

## 项目概览

| 维度 | 说明 |
|------|------|
| **定位** | 个人品牌展示 + 前后端联调练习 |
| **前端** | `aurora-site/` — HTML / CSS / 原生 JavaScript ES modules，无构建工具 |
| **后端** | `api/` — FastAPI + Uvicorn，JSON 文件 + SQLite 作数据源 |
| **联调方式** | 本地单进程（8000 端口同时提供页面与 `/api`），生产 Nginx 同域反代 |
| **测试** | `pytest` + FastAPI `TestClient`，GitHub Actions 自动运行 |
| **适用场景** | 简历链接、课程作业展示、本地开发演示 |

```
浏览器  ──  http://127.0.0.1:8000/  ──┐        （生产：https://your-domain.com/）
                                     │
                     FastAPI (app.main:app)
                     ├─ StaticFiles      →  aurora-site/（HTML / CSS / JS / 资源）
                     ├─ /api/projects    →  data/projects.json → Pydantic 校验 → 项目卡片
                     ├─ /api/messages    →  data/messages.db（SQLite）→ 留言读写
                     ├─ /api/health      →  健康检查
                     └─ /docs, /redoc    →  OpenAPI 文档
```

---

## 技术亮点（体现功底的部分）

### 前端 · 视觉与交互

- **CSS 变量 + 双主题**：`:root` 与 `.light-theme` 统一管理配色；切换主题时背景、卡片、星星等全局过渡，而非硬编码两套样式。
- **星空动效系统**：JS 动态生成 150 颗星星（随机大小、位置、透明度、动画时长）；定时器驱动流星；「小惊喜」按钮可批量触发流星雨，动画结束后 DOM 自动清理，避免内存泄漏。
- **ThemeManager 类**：封装主题切换逻辑——`localStorage` 持久化手动偏好、未手动选择时跟随 `prefers-color-scheme` 系统主题、通过 `stars.js` 导出的接口联动星星亮度。
- **打字机 + 光标闪烁**：昵称逐字输出，完成后注入闪烁光标动画。
- **玻璃拟态布局**：`backdrop-filter: blur`、渐变边框头像框、卡片 hover 微交互；768px 断点下左右栏变为上下堆叠。
- **模态框与无障碍**：微信二维码弹层支持点击遮罩关闭；项目区使用 `aria-live="polite"`、`aria-busy` 便于读屏感知加载与更新状态。
- **项目卡片骨架屏**：请求 API 前先渲染与真实卡片同布局的占位块（shimmer 动画）；桌面端 4 个、移动端 2 个；支持暗/亮主题；`prefers-reduced-motion` 时降级为静态灰块。
- **留言板交互**：昵称 + 留言内容表单，提交时按钮进入加载态；成功后自动刷新最新留言，失败时在页面内提示而不打断浏览。
- **主题差异化特效**：暗色主题是星空、流星雨与跟随光标的光尘；亮色主题是淡蓝天空、上升的泡泡与飘落的花瓣。「小惊喜」按钮按当前主题切换流星雨/泡泡，高亮态走 CSS 类而非写死颜色。
- **滚动进场与阅读进度条**：区块与卡片进入视口时淡入上浮，同层元素按顺序错峰出现（最多叠加 5 档）；页面顶部一条渐变细线随阅读进度伸长，不可滚动的短页面自动隐藏。动画只在支持 IntersectionObserver 且未开启「减少动效」时启用，无 JS 时内容照常可见。
- **小游戏大厅**：`games.html` 用标签切换俄罗斯方块、扫雷与 2048。俄罗斯方块是 canvas 渲染的 10×20 棋盘（7-bag 出块、暂存、幽灵块、等级加速）；扫雷三档难度且首点必安全，支持插旗与和弦展开；2048 支持单步撤销。最高分与最快用时写入 `localStorage`（不可用时静默降级），手机端有虚拟按键与滑动手势，配色同样适配明暗两套主题。
- **动效降级**：`prefers-reduced-motion: reduce` 时星星静止、不生成流星与粒子、跳过打字机动画，直接显示完整昵称。

### 前端 · 工程意识

- **ES modules 分层**：`js/` 下按职责拆分——`main.js` 负责装配，`api.js` 统一接口访问，`stars.js` / `theme.js` / `projects.js` / `guestbook.js` / `ui.js` 各管一块，模块之间只通过导出接口通信。
- **同源接口访问**：`api.js` 默认请求相对路径 `/api`，无需按环境判断主机；如前端独立部署，可通过 `window.AURORA_API_BASE` 覆盖。
- **前后端分离的数据流**：`loadProjectsFromApi()` 先展示骨架屏，再异步拉取 JSON，用 `DocumentFragment` 批量插入 DOM，减少重排；最短展示 300ms，避免本地请求过快时闪烁。
- **健壮的渲染逻辑**：校验响应是否为数组；外链仅当 `http` 开头时渲染，并加 `rel="noopener noreferrer"`；失败时给出可操作的红色提示。
- **渐进增强**：后端不可用时整站仍可浏览；只有「我的项目」「留言板」区块降级，不影响关于我、技能、简历下载等。
- **按需加载与资源回收**：游戏大厅的装配层在标签首次激活时才 `import()` 对应游戏模块，切走时调用模块返回的 `destroy()` 清理计时器、事件监听与 `ResizeObserver`；标签页隐藏时自动暂停，避免后台空转。

### 后端 · API 设计

- **应用工厂**：`create_app()` 组装路由、异常处理、CORS 与静态站点挂载，便于测试时注入不同配置；模块级 `app` 供 uvicorn 使用。
- **RESTful 路由**：`/api/health` 健康检查、`/api/projects` 列表、`/api/projects/{id}` 单条查询、`/api/messages` 留言读写，按 `routers/` 拆分维护。
- **Pydantic 数据校验**：`schemas.py` 定义 `Project` / `Message` 模型；每次请求读取 `projects.json` 后校验字段类型与格式，`id` 不可重复；非法数据返回 **500** 及具体错误路径（错误详情已做 JSON 序列化处理）。
- **配置外置**：项目数据、数据库、静态目录、CORS 白名单、留言条数上限全部由 `AURORA_*` 环境变量控制，代码里没有硬编码主机与端口。
- **SQLite 持久化留言**：首次取连接时自动创建 `api/data/messages.db` 和 `messages` 表；`POST /api/messages` 对昵称、内容做长度与空值校验，写入后立即公开展示。
- **同源优先**：默认不启用 CORS 中间件，只有显式配置 `AURORA_CORS_ORIGINS` 时才按白名单开放。
- **自动化测试**：pytest 覆盖项目校验、404、留言读写与上限、静态挂载、CORS 开关与配置解析，数据库指向临时目录，不污染本地数据。

### 内容与作品集整合

`projects.json` 统一承载 5 个项目（个人网站、星纬伙伴、灵心 AI、电动汽车专利挖掘、配套 API）的卡片与详情内容——改 JSON 即可同时更新主页与详情页，无需改 HTML，体现**数据驱动页面**的基本思路。项目详情页由 `project.html?id=` 渲染，简历页 `resume.html` 提供可打印的网页版（不含手机号，PDF 版本照常下载），游戏大厅 `games.html` 提供三个不依赖后端的纯前端小游戏。

---

## 目录结构

```
my_website/
├── aurora-site/              # 前端（纯静态，ES modules）
│   ├── index.html            # 首页：项目展示区、留言板与动效入口
│   ├── project.html          # 项目详情页（读取 ?id= 渲染）
│   ├── resume.html           # 在线简历页（可打印）
│   ├── games.html            # 游戏大厅：俄罗斯方块 / 扫雷 / 2048
│   ├── css/style.css         # 主题变量、动效、响应式、项目卡片与骨架屏样式
│   ├── js/
│   │   ├── main.js           # 入口：装配各模块
│   │   ├── api.js            # 统一接口访问层（默认 /api）
│   │   ├── stars.js          # 星空、流星与流星雨
│   │   ├── theme.js          # ThemeManager：主题切换与持久化
│   │   ├── projects.js       # 骨架屏 + 项目卡片渲染
│   │   ├── guestbook.js      # 留言加载、提交与状态提示
│   │   ├── bubbles.js       # 亮色主题的泡泡特效
│   │   ├── cursor.js        # 跟随光标的光尘 / 花瓣粒子
│   │   ├── subpage.js        # 子页面入口（主题 + 星空）
│   │   ├── games.js          # 游戏大厅装配层：标签切换与按需加载
│   │   ├── games/            # 小游戏模块（tetris / minesweeper / game2048 / storage）
│   │   ├── project-detail.js # 项目详情渲染
│   │   └── ui.js             # 打字机、弹层、小惊喜按钮与滚动交互
│   └── assets/               # 头像、微信二维码、简历 PDF、favicon、成果看板
├── api/                      # 后端（FastAPI）
│   ├── app/
│   │   ├── main.py           # create_app()：路由、CORS、静态站点挂载
│   │   ├── schemas.py        # Pydantic Project / Message 模型与字段规则
│   │   ├── db.py             # SQLite 连接与建表
│   │   ├── core/config.py    # 环境变量配置
│   │   └── routers/          # projects.py / messages.py
│   ├── data/
│   │   ├── projects.json     # 项目列表数据源
│   │   └── messages.db       # 留言 SQLite 数据库（运行后生成，已忽略）
│   ├── tests/                # pytest 用例
│   ├── requirements.txt      # 运行依赖
│   ├── requirements-dev.txt  # 测试依赖
│   └── .venv/                # 本地虚拟环境（已在 .gitignore）
├── deploy/                   # Nginx / systemd 部署样例
├── .github/workflows/ci.yml  # GitHub Actions：跑 pytest
└── README.md
```

---

## 环境要求

- **Python**：建议 3.11+（依赖在 3.13 下验证通过）
- **浏览器**：Chrome / Edge / Firefox 等现代浏览器

前端无需 Node.js；页面使用 ES modules，请通过 HTTP 访问（不要直接双击 `index.html`）。

---

## 快速开始

### 1. 启动后端（同时提供页面与接口）

```powershell
cd api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

若 PowerShell 禁止运行脚本，可先执行（仅需一次）：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

浏览器访问 **http://127.0.0.1:8000/** 即可，页面与接口同源：

| 说明 | 地址 |
|------|------|
| 站点首页 | http://127.0.0.1:8000/ |
| Swagger 文档 | http://127.0.0.1:8000/docs |
| ReDoc 文档 | http://127.0.0.1:8000/redoc |
| 健康检查 | http://127.0.0.1:8000/api/health |
| 项目列表 | http://127.0.0.1:8000/api/projects |
| 留言列表 | http://127.0.0.1:8000/api/messages |

页面向下滚动即可看到 **「我的项目」**（先出现骨架屏，再加载为卡片）与 **「留言板」**；侧栏 **「探索更多 → 我的项目 / 给我留言」** 会平滑滚动到对应区域，**「小游戏」** 则跳转到 http://127.0.0.1:8000/games.html。

> **改前端后要不要重启？** 静态文件（HTML / CSS / JS）保存后**刷新浏览器**即可（必要时 `Ctrl+F5` 硬刷新）；后端使用 `--reload` 启动时，改 `api/app/` 下的代码会自动重载。

### 2. 可选：前端用独立静态服务调试

想分开跑前端与后端时：

```powershell
cd aurora-site
python -m http.server 5500
```

此时页面来自 `5500`、接口来自 `8000`，需要两步配置：

1. 在 `index.html` 的模块脚本**之前**加一行：

   ```html
   <script>window.AURORA_API_BASE = 'http://127.0.0.1:8000';</script>
   ```

2. 启动后端时放开来源白名单：

   ```powershell
   $env:AURORA_CORS_ORIGINS = "http://127.0.0.1:5500"
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

---

## 环境变量

后端配置全部来自环境变量，未设置时使用仓库内默认值（`api/app/core/config.py`）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `AURORA_PROJECTS_FILE` | `api/data/projects.json` | 项目列表数据源 |
| `AURORA_MESSAGES_DB` | `api/data/messages.db` | 留言 SQLite 文件 |
| `AURORA_STATIC_DIR` | `aurora-site/` | 前端静态站点目录（不存在时不挂载） |
| `AURORA_CORS_ORIGINS` | 空 | 逗号分隔的来源白名单；为空则不启用 CORS |
| `AURORA_MESSAGES_LIMIT` | `50` | `/api/messages` 单次返回的留言条数上限 |

---

## 测试

```powershell
cd api
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m pytest
```

测试覆盖：项目列表与单条查询、`projects.json` 缺失/字段非法/`id` 重复/JSON 损坏、留言写入与读取、字段校验、`AURORA_MESSAGES_LIMIT` 截断、静态站点挂载、CORS 开关与环境变量解析。用例通过 `tmp_path` 隔离数据库与数据文件，不会写入 `api/data`。

CI：`.github/workflows/ci.yml` 在 push 与 PR 时自动安装依赖并运行 `python -m pytest`。

---

## 生产部署（Nginx 同域反代）

`deploy/` 提供了可直接改用的示例文件：`nginx-aurora-site.conf`、`aurora-api.service`、`aurora-api.env.example`。

1. **部署代码与依赖**

   ```bash
   git clone https://github.com/huxiaoman01/my_website.git /opt/my_website
   cd /opt/my_website/api
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   ```

2. **准备环境变量**：复制 `deploy/aurora-api.env.example` 到 `/etc/aurora-api.env` 并按实际路径修改。

3. **安装后端服务**：复制 `deploy/aurora-api.service` 到 `/etc/systemd/system/aurora-api.service`（把 `User`、`WorkingDirectory`、`ExecStart` 改成实际值），然后：

   ```bash
   systemctl daemon-reload
   systemctl enable --now aurora-api
   systemctl status aurora-api
   ```

4. **配置 Nginx**：复制 `deploy/nginx-aurora-site.conf` 到 `/etc/nginx/sites-available/aurora-site.conf`，修改 `server_name` 与 `root`，然后：

   ```bash
   ln -s /etc/nginx/sites-available/aurora-site.conf /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```

5. **开启 HTTPS**：`certbot --nginx -d your-domain.com`。同域反代后前端请求的是 `https://your-domain.com/api/...`，不存在混合内容问题，也无需在服务器上直接暴露 8000 端口。

> Swagger / ReDoc 默认不对公网开放；如需调试，取消 Nginx 配置里 `/docs`、`/openapi.json` 两段的注释。

---

## 前后端联动

1. 浏览器打开 http://127.0.0.1:8000/，`js/main.js` 装配后依次执行 `loadProjectsFromApi()` 与留言板初始化。
2. **加载态**：`#projects-grid` 先插入 2～4 个骨架卡片（`aria-busy="true"`）。
3. 请求 `GET /api/projects`；后端读取并 Pydantic 校验 `projects.json`。
4. 返回 JSON 数组后，清空骨架并在 `#projects-grid` 内动态生成真实卡片（标题、简介、标签、年份、`id`、外链等）；失败或空数组则显示对应提示文案。
5. 留言板请求 `GET /api/messages`，提交表单时请求 `POST /api/messages`，后端写入 `api/data/messages.db` 后返回新留言。
6. 修改项目展示内容：编辑 `api/data/projects.json` 后保存并刷新浏览器即可（数据须符合 `schemas.py` 字段规则）。

---

## API 说明

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 返回服务是否正常 |
| `GET` | `/api/projects` | 返回 `data/projects.json` 中的项目数组 |
| `GET` | `/api/projects/{project_id}` | 按 `id` 返回单条，含 `detail` 详情内容；不存在则 `404` |
| `GET` | `/api/messages` | 返回最近留言，按时间倒序，条数受 `AURORA_MESSAGES_LIMIT` 限制 |
| `POST` | `/api/messages` | 新增留言；请求体为 `name` 与 `content` |

---

## `projects.json` 字段约定

后端通过 `api/app/schemas.py` 中的 `Project` 模型校验；任一条目不合法或 `id` 重复时，`GET /api/projects` 与 `GET /api/projects/{id}` 返回 **500**，响应 `detail` 中含 `errors` 或 `duplicate_ids`，便于定位问题。

| 字段 | 类型 | 校验规则 | 说明 |
|------|------|----------|------|
| `id` | 字符串 | 必填；小写字母、数字、连字符；列表内唯一 | 用于 `/api/projects/{id}` |
| `title` | 字符串 | 必填；1～80 字符 | 卡片标题 |
| `summary` | 字符串 | 必填；1～500 字符 | 卡片简介 |
| `tags` | 字符串数组 | 必填；每项为非空字符串 | 标签列表，可为 `[]` |
| `link` | 字符串 | 可选；默认 `""`；非空时必须是 `http://` / `https://` 外链，或指向 `assets/` 的站内路径（不允许 `..`、反斜杠与其它协议前缀） | 外链显示「查看链接」，站内成果页显示「查看成果」 |
| `year` | 整数 | 可选；2000～2100 | 显示在卡片元信息区 |
| `detail` | 对象 | 可选；项目详情页内容，缺失时详情页降级为简介 | 仅单条查询返回，字段见下表 |

`detail` 对象（列表接口会自动裁剪掉）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `role` | 字符串 | 可选；我在项目中的角色（≤60 字） |
| `period` | 字符串 | 可选；时间区间（≤60 字） |
| `stack` | 字符串数组 | 可选；技术栈，最多 20 项 |
| `metrics` | 对象数组 | 可选；指标卡，最多 6 个，每项 `label` / `value` |
| `sections` | 对象数组 | 可选；正文章节，最多 8 个，每项 `heading` / `paragraphs` / `bullets` |
| `links` | 对象数组 | 可选；详情页按钮，最多 5 个，每项 `label` / `href`（规则同 `link`） |

---

## 留言板字段约定

留言数据保存在 `api/data/messages.db`，该文件由后端首次写入时自动创建，并已通过 `.gitignore` 排除，不会提交到 GitHub。

| 字段 | 类型 | 校验规则 | 说明 |
|------|------|----------|------|
| `id` | 整数 | 自动生成 | 留言唯一 ID |
| `name` | 字符串 | 必填；1～20 字符；自动去除首尾空格 | 公开展示的昵称 |
| `content` | 字符串 | 必填；1～300 字符；自动去除首尾空格 | 公开展示的留言内容 |
| `created_at` | 字符串 | 后端生成 ISO 时间 | 前端按本地时间格式化展示 |

接口示例：

```powershell
curl -X POST http://127.0.0.1:8000/api/messages `
  -H "Content-Type: application/json" `
  -d "{\"name\":\"Aurora\",\"content\":\"欢迎来到留言板。\"}"
```

---

## 依赖（后端）

见 `api/requirements.txt`：

- `fastapi` — Web 框架与 OpenAPI 文档
- `uvicorn[standard]` — ASGI 服务器（含热重载）

测试依赖见 `api/requirements-dev.txt`：`pytest`、`httpx`。

---

## 常见问题

**`uvicorn` 不是内部或外部命令** — 在已激活的 `.venv` 下使用：

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**页面样式或脚本没生效** — 确认通过 `http://127.0.0.1:8000/` 访问（不要用 `file://`，ES modules 会被浏览器拦截）；样式与脚本已移入 `css/`、`js/`，如自行改过路径请同步 `index.html`。

**项目区无法加载 / 留言区报错** — 检查后端是否在 `127.0.0.1:8000` 运行，页面是否通过 `http://127.0.0.1:8000/` 打开；若前端另用 `5500` 端口，需设置 `AURORA_CORS_ORIGINS` 与 `window.AURORA_API_BASE`。

**接口返回 500 / 项目区无法加载** — 打开 <http://127.0.0.1:8000/docs> 试调 `GET /api/projects`，查看 `detail.errors` 中指明的条目 index 与字段；常见原因：缺少必填字段、`id` 含大写或空格、`year` 写成字符串、两条记录 `id` 相同、JSON 语法损坏。

**留言提交失败** — 检查昵称是否超过 20 字、留言是否超过 300 字；确认后端已启动。

**测试报 `PermissionError` 或无法创建临时目录** — 在能正常访问系统临时目录的环境下运行；CI 中由 GitHub Actions 的 runner 提供。

---

## 后续可扩展方向

- 留言板增加审核、删除、限流或验证码
- 引入构建工具（Vite）以获得打包与热更新，或迁移到组件框架
- 把项目数据从 JSON 迁移到数据库，并增加后台管理界面

---

## 许可证

个人学习 / 展示用项目；如需开源再补充具体许可证条款即可。

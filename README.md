# Aurora's World · 个人网站

前后端分离方向的练习项目：**静态个人主页**（`aurora-site`）+ **FastAPI 接口**（`api`）。前端负责布局、动效与主题；后端提供 JSON。**主页「我的项目」区块**会在页面加载时请求 `GET /api/projects`，将 `api/data/projects.json` 渲染为卡片列表（后端未启动或跨域不匹配时，该区域会显示错误提示，其余页面仍可用）。

---

## 目录结构

```
my_website/
├── aurora-site/              # 前端（纯静态）
│   ├── index.html            # 含 #projects 项目展示区
│   ├── style.css             # 含项目卡片等样式
│   ├── script.js             # API_BASE、loadProjectsFromApi、主题等逻辑
│   └── assets/               # 图片、图标、简历 PDF 等资源
├── api/                      # 后端（FastAPI）
│   ├── main.py               # 路由与 CORS
│   ├── requirements.txt
│   ├── data/
│   │   └── projects.json     # 项目列表数据源（可被前端拉取展示）
│   └── .venv/                # 本地虚拟环境（建议加入 .gitignore）
└── README.md
```

---

## 环境要求

- **Python**：建议 3.11+（依赖在 3.13 下可用）
- **浏览器**：任意现代浏览器（Chrome / Edge / Firefox 等）

前端无需 Node.js；若日后引入 Vite / React 等再单独说明。

---

## 快速开始

本地联调需要**同时**运行：前端静态服务（默认 **5500**）+ 后端 API（**8000**）。`script.js` 中 `API_BASE` 默认为 `http://127.0.0.1:8000`，与 `main.py` 里 CORS 允许的 `5500` 前端来源一致。

### 1. 启动后端 API（FastAPI）

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

**说明**：激活后提示符前会出现 `(.venv)`。务必在 **`api` 目录** 下执行上述命令，否则找不到 `main:app`。日常重启电脑后，只需 `cd api` → 激活 `.venv` → 再执行 `python -m uvicorn ...`，无需重复 `python -m venv`（除非删除了 `.venv`）。

| 说明 | 地址 |
|------|------|
| Swagger 文档 | <http://127.0.0.1:8000/docs> |
| ReDoc 文档 | <http://127.0.0.1:8000/redoc> |
| 健康检查 | <http://127.0.0.1:8000/api/health> |
| 项目列表（与主页同源数据） | <http://127.0.0.1:8000/api/projects> |

根路径 `http://127.0.0.1:8000/` 未配置页面时可能返回 **404**，属正常现象。

---

### 2. 查看个人主页（前端）

**推荐：本地 HTTP（与 `fetch` + CORS 一致）**

```powershell
cd aurora-site
python -m http.server 5500
```

浏览器访问：<http://127.0.0.1:5500/>

页面向下滚动即可看到 **「我的项目」**；侧栏/下方 **「探索更多 → 我的项目」** 会平滑滚动到该区域。

**仅打开 `index.html`（`file://`）**：整站仍可浏览，但浏览器对跨域限制更严，**项目列表很可能无法加载**；联调时请优先用 `http.server 5500`。

**只开前端、不开后端**：项目区会显示红色提示文案；其它板块（关于我、技能、动效等）不受影响。

---

## 前后端如何联动（当前实现）

1. 浏览器打开 `http://127.0.0.1:5500/`，执行 `script.js` 中的 `loadProjectsFromApi()`。  
2. 请求 `GET {API_BASE}/api/projects`，默认即 `http://127.0.0.1:8000/api/projects`。  
3. 返回 JSON 数组后，在 `#projects-grid` 内动态生成卡片（标题、简介、标签、年份与 `id`、外链等）。  
4. 修改展示内容：编辑 `api/data/projects.json` 后保存，刷新浏览器即可（后端 `--reload` 会重载进程；数据为每次请求读取文件）。

若更换前端端口或 API 地址：同步修改 **`aurora-site/script.js` 顶部的 `API_BASE`**，并在 **`api/main.py` 的 `allow_origins`** 中加入你的前端来源。

---

## API 说明（当前版本）

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 返回服务是否正常 |
| `GET` | `/api/projects` | 返回 `data/projects.json` 中的项目数组 |
| `GET` | `/api/projects/{project_id}` | 按 `id` 返回单条；不存在则 `404` |

---

## `projects.json` 字段约定

每条记录建议包含以下字段（与前端渲染逻辑一致）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | 字符串 | 唯一标识，用于 `/api/projects/{id}` |
| `title` | 字符串 | 卡片标题 |
| `summary` | 字符串 | 卡片简介 |
| `tags` | 字符串数组 | 标签列表 |
| `link` | 字符串 | 可选；**仅当以 `http` 开头** 时，卡片显示「查看链接」并在新标签页打开 |
| `year` | 数字 | 可选；显示在卡片元信息区 |

仓库内已预置多条示例（个人站、数据看板练习、数据库课设、大创材料、文本分析练习、FastAPI 接口说明等），可直接增删改。**请保持合法 JSON**（逗号、引号、括号匹配）。

---

## 跨域（CORS）

`api/main.py` 中 `CORSMiddleware` 的 `allow_origins` 开发环境包含：

- `http://127.0.0.1:5500`、`http://localhost:5500`
- `http://127.0.0.1:8000`、`http://localhost:8000`
- `http://127.0.0.1:3000`、`http://localhost:3000`

上线前改为你的**真实前端域名**，避免过于宽松的白名单。

---

## 依赖（后端）

见 `api/requirements.txt`：

- `fastapi`：Web 框架与 OpenAPI 文档  
- `uvicorn[standard]`：ASGI 服务器（含热重载等）

在已激活的虚拟环境中安装：

```powershell
pip install -r requirements.txt
```

---

## 常见问题

### 1. `uvicorn` 不是内部或外部命令

未激活虚拟环境，或 `Scripts` 未加入 PATH。在已激活的 `.venv` 下使用：

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

也可不激活，直接：

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 2. `Attribute "app" not found in module "main"`

多为 **`api/main.py` 未保存或磁盘上为空**。请保存文件并确认存在 `app = FastAPI(...)`。

### 3. `pip install` 提示写入系统目录失败

先创建并**激活**虚拟环境，再执行 `pip install -r requirements.txt`，依赖会安装到 `.venv`。

### 4. 项目区提示无法加载 / 控制台 `fetch` 失败

- 后端是否在 `127.0.0.1:8000` 运行？  
- 前端是否通过 **`http://127.0.0.1:5500`**（或已在 CORS 中配置的来源）访问？  
- 防火墙或代理是否拦截本地请求？

### 5. 前端 `fetch` 报 CORS 错误

检查 `allow_origins` 是否包含当前页面的协议 + 主机 + 端口，并与 `API_BASE` 指向的后端地址一致。

---

## 后续可扩展方向（备忘）

- 用 Pydantic 模型约束 `projects` 的请求/响应结构  
- 将 `projects.json` 换为 SQLite / PostgreSQL  
- 新增留言、访问量等 `POST` 接口，并做鉴权或限流  
- 生产部署：前端静态托管（如 GitHub Pages）+ 后端独立服务；或用 Nginx 同域反代 `/api`  

---

## 许可证

个人学习/展示用项目；如需开源再补充具体许可证条款即可。

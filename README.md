# MyWeb

轻量级的多人桌面风格 Web 应用。前端使用 **Vue 3 + Vite**，后端采用 **Node.js + Express**，持久化基于 **SQLite**。仓库通过 npm workspaces 同时管理 `client/` 与 `server/` 两个包。

---

## 目录速览

```
myweb/
├── client/           # 前端 Vue 应用
├── server/           # 后端 Express 服务
├── deploy.sh         # Docker Compose 一键部署脚本
├── build_myweb_images_tar.sh  # 镜像打包工具
├── docker-compose.yml          # 生产运行所需的唯一服务 (myweb)
├── Dockerfile        # 多阶段构建（前后端同镜像）
├── dist/             # 可选：统一保存打包产物
├── .env(.example)    # 环境变量入口
└── README.md
```

---

## 环境要求

- Node.js ≥ 20
- npm ≥ 9
- （部署可选）Docker 24+ 与 docker compose 插件

---

## 快速开始（本地开发）

1. **克隆代码并安装依赖**

   ```bash
   git clone <repo-url>
   cd myweb
   npm install
   ```

2. **准备环境变量**

   ```bash
   cp .env.example .env
   # 按需修改 PORT / VITE_API_BASE / CORS_ORIGIN 等
   ```

3. **启动开发模式**（默认前端 3000，后端 3000/10010 由 `.env` 控制）

   ```bash
   npm run dev
   ```

   - 单独运行：`npm run dev:client` 或 `npm run dev:server`
   - 访问地址：<http://localhost:3000>（Vite dev server 会代理 `/api` & `/ws` 到后端）

---

## 常用脚本

| 命令                                      | 说明                                                          |
| ----------------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                             | 并行启动前端与后端开发服务                                    |
| `npm run build`                           | 先构建后端再构建前端（生成 `client/dist` + 保持服务器可运行） |
| `npm start`                               | 以生产模式启动后端（假设已有 `client/dist`）                  |
| `npm run lint:check` / `npm run lint`     | ESLint 检查 / 自动修复                                        |
| `npm run format:check` / `npm run format` | Prettier 校验与格式化                                         |
| `npm test -w server`                      | 运行后端 Jest 测试                                            |
| `npm run test -w client`                  | 运行前端 Vitest                                               |
| `npm run contract-test`                   | 使用 Spectral 检查 `server/openapi.yaml`                      |

---

## 构建产物

```bash
npm run build
```

- 后端：仍旧运行 `server/src/server.js`（内置构建步骤主要用于确保依赖就绪）。
- 前端：产物位于 `client/dist/`，部署镜像会将其拷贝到 `/app/client/dist` 并由同一 Node 进程提供静态文件。

---

## 部署指南

### 方案一：一键脚本 `deploy.sh`

```bash
chmod +x deploy.sh
./deploy.sh              # 默认读取 .env 并执行 docker compose up --build
```

- `.env` 中的 `PORT`/`BACKEND_PORT` 控制宿主机对外端口映射。
- `DEPLOY_VITE_API_BASE` 或 `VITE_API_BASE` 会写入 `client/.env.production`，确保前端 API 地址正确。
- 支持 `--no-build`、`--force-recreate`、`--skip-health-check` 等参数（运行 `./deploy.sh --help` 查看全部选项）。
- 持久化数据通过命名卷挂载：`myweb-data`、`myweb-uploads`、`myweb-logs`。

### 方案二：手动执行 Docker Compose

```bash
docker compose up -d --build
```

- `docker-compose.yml` 仅包含 `myweb` 一个服务，端口映射默认 `${PORT:-3000}:3000`。
- 需要在宿主机提供 `.env`（或附加 `--env-file`）。
- 首次启动后可以通过 `docker compose logs -f myweb` 查看健康检查、数据库初始化和 WebSocket 状态。

### 离线镜像打包

```bash
chmod +x build_myweb_images_tar.sh
./build_myweb_images_tar.sh -o dist/myweb-images.tar
```

脚本会：

1. 构建当前项目镜像。
2. 将所需镜像导出到指定 tar 包（可选 gzip 压缩）。
3. 生成 `*.manifest` 记录镜像摘要与大小，方便在离线主机上 `docker load`。

---

## 环境变量速查

| 变量                    | 作用                                                  | 默认           |
| ----------------------- | ----------------------------------------------------- | -------------- |
| `FRONTEND_PORT`         | Vite 开发服务器端口                                   | `3000`         |
| `BACKEND_PORT` / `PORT` | 生产环境对外暴露端口（Docker 宿主机 -> 容器 3000）    | `10010` 示例值 |
| `VITE_API_BASE`         | 前端构建时使用的 API 基础路径（`/api` 或完整 URL）    | `/api`         |
| `DEPLOY_VITE_API_BASE`  | 部署脚本专用覆盖项，优先写入 `client/.env.production` | _(未设置)_     |
| `CORS_ORIGIN`           | 后端允许的跨域来源                                    | `*`            |
| `RATE_LIMIT`            | 15 分钟内最大请求数（Express rate-limit）             | `1000`         |

更多可在 `.env.example` 中查阅。

---

## 数据与静态资源

- 数据库：`server/data/myweb.db`
- 上传目录：`server/uploads/`（包括 `wallpapers/`、`files/` 等子目录）
- 前端静态资源构建后会被后端应用以 `express.static` 方式提供。

---

## API 概览

后端路由文档可参考 `server/openapi.yaml`。常用端点示例：

- `GET /api/wallpapers` — 获取壁纸列表
- `POST /api/files/upload` — 上传普通文件/小说
- `GET /api/myapps` — 获取已注册的桌面应用
- `POST /internal/logs` — 收集客户端 AI 日志

---

## 贡献

- 提交前运行 `npm run lint:check && npm run format:check`，保持代码风格统一。
- 项目使用 Husky + lint-staged 自动格式化常见文件类型。
- 欢迎在 GitHub Issues 中反馈 Bug 或提出功能建议。

# MyWeb — 项目说明（中文）

轻量的多人桌面型 Web 应用（单仓库 monorepo），前端使用 Vue 3 + Vite，后端使用 Node.js + Express，数据库为 SQLite。仓库按 `client/` 与 `server/` 分离前后端代码，根目录使用 npm workspaces 管理。

下面的 README 已根据仓库当前文件校对并做简明整理，包含开发、构建、部署与常用路径。

## 我将要做/已做的核对清单

- [x] 核对项目结构（`client/`、`server/`、`scripts/`、`docker/` 等）
- [x] 阅读根、`client`、`server` 的 `package.json` 以确定常用脚本
- [x] 查看并理解一键开发脚本 `scripts/dev.sh` 的行为（安装依赖、修复权限、db 检查、启动前后端）
- [x] 确认数据库与上传目录的默认位置（`server/data/myweb.db`、`server/uploads/`）

## 快速开始（本地开发）

1. 克隆并进入仓库：

```bash
git clone <repo-url>
cd myweb
```

2. 推荐：使用一键开发脚本（会安装依赖、修复权限、检查 DB 并并行启动前后端）：

```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

脚本默认：前端端口 `3000`（可通过 FRONTEND_PORT 覆盖）；后端端口 `3302`（可通过 BACKEND_PORT 覆盖）。脚本会创建/修复 `server/data`、`server/uploads`、`server/logs` 的权限并运行 `server` 的 `db:check` 脚本。

可单独运行：

```bash
# 后端
cd server
npm install
npm run dev

# 前端
cd client
npm install
npm run dev
```

## 端口与访问

- 前端（Vite 开发服务器）: http://localhost:3000
- 后端 API: http://localhost:3302
- WebSocket: ws://localhost:3302/ws

（如需修改，编辑 `.env` 或在启动时设置环境变量）

## 构建与部署（简要）

- 构建（本地）：

```bash
npm run build
```

- 使用 Docker（仓库含 `docker/` 配置）：

```bash
cd docker
docker-compose up -d
```

容器启动过程会执行必要的初始化脚本，查看容器日志以获取具体细节。

## 常用脚本摘要

- 根目录 `package.json`（workspaces）
  - `npm run dev` — 并行启动 `client` 与 `server`（使用 concurrently）
  - `npm run build` — 构建前后端
  - `npm start` — 启动后端（生产）

- `client/`
  - `npm run dev` — Vite 开发服务器（默认 3000）
  - `npm run build` — 构建前端
  - `npm run test` — 使用 vitest

- `server/`
  - `npm run dev` — 使用 nodemon 启动后端（默认 3302）
  - `npm run migrate` / `npm run seed` — Knex 迁移/seed
  - `npm run db:check` — 仓库提供的 DB 检查脚本

## 重要路径

- 数据库文件：`server/data/myweb.db`
- 上传目录：`server/uploads/`（壁纸位于 `server/uploads/wallpapers/`）
- OpenAPI：`server/openapi.yaml`
- Docker 配置：`docker/docker-compose.yml`
- 开发脚本：`scripts/dev.sh`

## 技术栈（概要）

- 前端：Vue 3 + Vite + Vue Router
- 后端：Node.js + Express
- 数据库：SQLite（better-sqlite3），并通过 Knex 管理迁移/seed
- 实时：ws（WebSocket）
- 上传：Multer
- 验证：Joi

## API 快览

示例接口（更多在 `server/src/routes` 或 `server/openapi.yaml`）：

- `GET /api/wallpapers` — 获取壁纸列表
- `POST /api/wallpapers` — 上传壁纸
- `PUT /api/wallpapers/:id/active` — 切换活跃壁纸
- `DELETE /api/wallpapers/:id` — 删除壁纸



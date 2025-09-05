# MyWeb — 多人桌面 Web 应用

这是一个基于 Vue 3（Vite）与 Node.js/Express 的多人桌面类 Web 应用，支持壁纸上传、管理、随机切换、以及多个内置小应用（如贪吃蛇、五子棋等）的在线体验。

下面的 README 已根据当前仓库状态进行了校对，包含准确的开发/运行命令、端口、以及重要文件位置。

## 主要特性

- 壁纸上传、分组与随机切换
- 文件上传与静态资源托管（Multer + /uploads）
- 内置小游戏（蛇、五子棋等）和多玩家支持（WebSocket）
- 使用 SQLite 做为轻量数据库（位于 `server/data/myweb.db`）
- 使用 Vite 开发前端，支持代理到后端 API 与 WebSocket

## 快速开始（开发）

建议在 Linux/macOS 终端中运行以下步骤：

1) 克隆仓库并进入项目目录：

```bash
git clone <repo-url>
cd myweb
```

2) 启动一键开发脚本（会安装依赖、检查数据库、启动前后端）：

```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

脚本默认前端在端口 3000，后端在 3302（可通过环境变量 FRONTEND_PORT/BACKEND_PORT 覆盖）。脚本会：

- 安装依赖（若未安装）
- 检查/修复数据库权限并运行后端的 db check
- 启动后端（`server`）和前端（`client`）服务

如果只想分别运行：

- 启动后端：

```bash
cd server
npm install
npm run dev
```

- 启动前端：

```bash
cd client
npm install
npm run dev
```

## 端口与访问

- 前端（Vite 开发服务器）：http://localhost:3000
- 后端 API：http://localhost:3302
- WebSocket（后端）：ws://localhost:3302/ws

这些值可在环境变量中调整（见下文）。

## 生产部署（简要）

项目包含 Docker 配置（`docker/docker-compose.yml`、Dockerfile 等），可通过 docker-compose 部署：

```bash
cd docker
docker-compose up -d
```

容器启动后，服务会在容器内自动完成必要的 schema 初始化与兜底检查（仓库内后端会在启动时创建上传目录并进行必要的初始化）。

## 项目技术栈

- 前端：Vue 3 + Vite + Vue Router
- 后端：Node.js + Express
- 数据库：SQLite（better-sqlite3 + Knex 用于迁移/seed）
- WebSocket：ws
- 文件上传：Multer
- 验证：Joi

## 环境变量

复制 `.env.example` 为 `.env` 并根据需要修改（部分常用项示例）：

```env
# 前端 (Vite)
VITE_API_BASE=http://localhost:3302
VITE_APP_TITLE=MyWeb

# 后端
PORT=3302
NODE_ENV=development
DB_PATH=./data/myweb.db
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT=100
```

## 代码组织（概要）

- `client/` — Vue 前端源码（入口：`client/src/main.js`，路由：`client/src/router`）
- `server/` — 后端代码（入口：`server/src/server.js`），包含控制器、服务、路由、utils、以及 `data/`、`uploads/` 目录
- `scripts/` — 辅助脚本（开发脚本 `scripts/dev.sh`）
- `docker/` — Docker 和部署相关配置

## 常用脚本

在仓库根目录：

- npm run dev — 并行启动前后端（通过根 package.json 的 concurrently）
- npm run build — 构建前后端
- npm start — 启动已构建的后端

在 `client`：

- npm run dev — 启动 Vite 开发服务器 (port 3000)
- npm run build — 构建前端

在 `server`：

- npm run dev — 使用 nodemon 启动后端 (默认 PORT=3302)
- npm run migrate / npm run seed — 使用 Knex 运行迁移和 seed
- npm run db:check — 后端提供的数据库检查脚本，dev 脚本会调用它

## API 快览

后端暴露了若干 REST 接口（部分示例）：

- GET /api/wallpapers — 获取壁纸列表
- POST /api/wallpapers — 上传壁纸
- PUT /api/wallpapers/:id/active — 切换活跃壁纸
- DELETE /api/wallpapers/:id — 删除壁纸

更多接口请查看 `server/src/routes` 下具体实现或打开 `server/openapi.yaml`。

## 数据库与上传

- SQLite 数据库文件：`server/data/myweb.db`
- 上传目录（默认）：`server/uploads/`（壁纸位于 `server/uploads/wallpapers/`）

开发脚本会在启动前确保这些目录存在并修复权限。

## 贡献

欢迎贡献。请遵循仓库中的 `rule.md` 与提交规范。常见流程：Fork → 新分支 → 提交 → PR。


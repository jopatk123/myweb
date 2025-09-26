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

脚本默认：前端端口 `3000`（可通过 FRONTEND_PORT 覆盖）；后端端口默认使用 `PORT` 或 `BACKEND_PORT`（示例默认 3000）。脚本会创建/修复 `server/data`、`server/uploads`、`server/logs` 的权限并运行 `server` 的 `db:check` 脚本。

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
- 后端 API: http://localhost:${BACKEND_PORT:-3000}
- WebSocket: ws://localhost:${BACKEND_PORT:-3000}/ws

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

## 部署与构建代理 / 镜像源（可选，稳健配置）

在国内或受限网络环境下，构建镜像时可能需要代理或使用国内的 Alpine 镜像源。仓库已支持可选的构建时参数，推荐如下做法以保持可移植性：

要点：
- 不要把代理或镜像源写死到 `Dockerfile` 中；使用 build-time `ARG` 与环境变量，让不同主机/CI 按需注入。
- 当需要在构建时使用国内镜像源，可通过 `ALPINE_MIRROR` 传入镜像基址（例如 `http://mirrors.aliyun.com/alpine/v3.21`）。

常用环境变量（可在部署主机或 CI 中设置）：

- http_proxy / https_proxy：HTTP/HTTPS 代理地址（例如 `http://127.0.0.1:7897` 或 `http://172.17.0.1:7897`）
- no_proxy / NO_PROXY：绕过代理的地址（务必包含 `127.0.0.1,localhost` 以避免本机请求走代理）
- ALPINE_MIRROR：可选的 Alpine 镜像基址（例如 `http://mirrors.aliyun.com/alpine/v3.21`）

示例：在本机需要通过代理和使用阿里镜像构建：

```bash
# 导出代理与镜像源（仅在需要时）
export http_proxy=http://172.17.0.1:7897
export https_proxy=http://172.17.0.1:7897
export no_proxy=localhost,127.0.0.1
export ALPINE_MIRROR=http://mirrors.aliyun.com/alpine/v3.21

# 使用 docker compose build 并把 build args 传入（compose 已配置读取这些 args）
docker compose -f docker/docker-compose.yml build --no-cache
docker compose -f docker/docker-compose.yml up -d --build
```

如果你希望让 Docker daemon 全局使用代理（可避免在某些环境中手动传入 build args），在部署主机上使用 systemd drop-in 配置（示例）：

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d
cat <<'EOF' | sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:7897"
Environment="HTTPS_PROXY=http://127.0.0.1:7897"
Environment="NO_PROXY=localhost,127.0.0.1,172.17.0.1"
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

注意与最佳实践：

- 健康检查与本机请求：部署脚本会通过 `curl` 访问 `127.0.0.1`，若在环境变量中全局设置了 `http_proxy`，请确保 `NO_PROXY` 包含 `127.0.0.1,localhost` 或在本地请求使用 `curl --noproxy 127.0.0.1`，以避免请求被代理并返回 502。
- CI 与多主机部署：建议把代理 / ALPINE_MIRROR 作为 CI 环境变量或主机级配置，不要提交这些敏感或环境相关的值到仓库。
- 可移植性：默认不设置 `ALPINE_MIRROR` 将使用官方仓库；仅在确实需要时注入镜像参数。

如果需要，我可以把以上示例添加到仓库的 `CONTRIBUTING.md` 或 `deploy` 文档中作为部署模板。

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
  - `npm run dev` — 使用 nodemon 启动后端（默认使用 PORT 或 BACKEND_PORT，例如 3000）
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



# MyWeb · 桌面风格 Web 平台

**MyWeb** 是一个以 Vue 3 前端 + Express/SQLite 后端构建的多应用桌面工作空间，使用 npm workspaces 分离 client/server，封装音频、文件、笔记、游戏等多种体验，并通过 WebSocket 提供实时协作。

## 核心快照

- **工作区**：`client/`（Vite + Vue 3）、`server/`（Express + WebSocket + Knex + SQLite）、`docs/`、`uploads/`、`tests/` 提供文档与资源。
- **主要能力**：桌面化 UI、文件与媒体管理、多端协作游戏/消息、SQLite 数据持久化、Docker 部署脚本。
- **开发支撑**：Vitest/Jest、ESLint+Prettier、commitizen/Husky、Spectral 校验 OpenAPI。

## 快速上手

1. **准备**
   ```bash
   git clone https://github.com/jopatk123/myweb.git
   cd myweb
   npm install
   cp .env.example .env
   ```
2. **启动开发环境（前后端并行）**
   ```bash
   npm run dev
   ```
   前端默认在 3000，Vite 会代理 `/api` 和 `/ws` 到后端。
3. **单独调试**
   ```bash
   npm run dev:client    # 仅前端
   npm run dev:server    # 仅后端
   ```
4. **生产构建与运行**
   ```bash
   npm run build
   npm start
   ```

## 访问密码

- 前端启动后会先进入访问验证界面，输入正确密码后才能进入页面。
- 默认密码为 **asd123123123**，配置在 [client/src/constants/auth.js](client/src/constants/auth.js)。
- 验证通过后会写入本地存储，有效期 30 天，到期后需再次输入密码。

## 目录概览

- `client/`：Vue 3 桌面 Shell，内置 calculator、music-player、notebook、novel-reader、snake、gomoku、work-timer 等应用；composables、components、api、styles 等模块分层。
- `server/`：Express app + WebSocket、路由/控制器/服务/模型/DTO、Knex 迁移+seed、uploads（files/music/etc）、data/myweb.db、logs、OpenAPI。
- `docker-compose.yml` + `Dockerfile` + `deploy.sh`：一键构建并带环境变量支持；`build_myweb_images_tar.sh` 可离线打包镜像。

## 重点脚本

| 命令                                                  | 作用                       |
| ----------------------------------------------------- | -------------------------- |
| `npm run dev`                                         | 并行前后端开发服务         |
| `npm run dev:client`, `npm run dev:server`            | 分别启动前端/后端          |
| `npm run build`, `npm start`                          | 构建并运行生产后端         |
| `npm run lint`, `npm run format`                      | ESLint/Prettier 自动修复   |
| `npm test -w client`, `npm test -w server`            | Vitest/Jest 单元测试       |
| `npm run contract-test`                               | 检查 `server/openapi.yaml` |
| `npm run migrate -w server`, `npm run seed -w server` | 数据库迁移与初始化         |

## 部署与容器

- `./deploy.sh`：读取 `.env`、构建镜像、启动容器、执行初始化，再做健康检查；`--help` 可查看选项。
- `docker compose up -d --build`：手动部署，可用 `down`、`down -v` 清理。
- `build_myweb_images_tar.sh`：打包镜像供离线目标机 `docker load`，再用 Compose 启动。

## 关键环境变量

| 变量                   | 默认          | 说明                  |
| ---------------------- | ------------- | --------------------- |
| `NODE_ENV`             | `development` | 运行模式              |
| `BACKEND_PORT`         | `3000`        | 后端 HTTP/WS 端口     |
| `FRONTEND_PORT`        | `3000`        | Vite dev 端口         |
| `VITE_API_BASE`        | `/api`        | 前端打包时的 API 前缀 |
| `CORS_ORIGIN`          | `*`           | 允许跨域来源          |
| `FILE_MAX_UPLOAD_SIZE` | `1gb`         | 通用上传限制          |
| `DOCKER_BUILDKIT`      | `1`           | 构建时启用 BuildKit   |
| `DOMAIN`               | `localhost`   | Docker Compose 项目域 |

## 数据与存储

- **数据库**：`server/data/myweb.db`（SQLite + Knex），使用 `npm run db:setup -w server` 初始化。
- **上传目录**：`server/uploads/{files,music,wallpapers,novels,apps,message-images}`，Docker volumes `myweb-data`, `myweb-uploads`, `myweb-logs` 保持持久。
- **API 文档**：`server/openapi.yaml`（Spectral 校验结果输出到 `contract-report.json`）。

## 测试与验证

- `npm test -w client` / `npm test -w server`，可加 `test:cov` 查看覆盖率。
- `npm run contract-test` 验证 OpenAPI，报告写入 `contract-report.json`。

---

如需深入了解各应用、接口、Docker 或部署策略，请直接浏览对应子目录或 OpenAPI 文档。

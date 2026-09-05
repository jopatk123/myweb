# MyWeb · 桌面风格 Web 平台

**MyWeb** 是一个以 Vue 3 前端 + Express/SQLite 后端构建的多应用桌面工作空间，使用 npm workspaces 分离 client/server，封装文件、笔记、留言等多种体验，并通过 WebSocket 提供实时协作。

## 核心快照

- **工作区**：`client/`（Vite + Vue 3）、`server/`（Express + WebSocket + Knex + SQLite）、`shared/`（前后端共享常量）、`docs/`。
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

   前端默认在 5173，Vite 会将 `/api`、`/internal`、`/uploads`（HTTP）与 `/ws`（WebSocket）代理到后端。

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
- 访问密码由 `APP_PASSWORD` 控制；开发环境可留空以免密访问，生产环境必须显式配置。
- 访问 cookie 的签名密钥由 `APP_AUTH_SECRET` 控制；**生产环境必须单独配置**，不要复用 `APP_PASSWORD`。
- 验证通过后后端会写入 `HttpOnly` 访问 cookie，默认有效期 30 天，到期后需再次输入密码。

## 目录概览

- `client/`：Vue 3 桌面 Shell，内置 calculator、notebook、work-timer 等应用；composables、components、api、styles 等模块分层。
- `server/`：Express app + WebSocket、路由/控制器/服务/模型/DTO、Knex 迁移+seed、uploads（files/etc）、data/myweb.db、logs、OpenAPI。
- `docker-compose.yml` + `Dockerfile` + `deploy.sh`：一键构建并带环境变量支持；`docker save` 可离线导出镜像。

## 重点脚本

- `npm run dev`：并行前后端开发服务。
- `npm run dev:client`, `npm run dev:server`：分别启动前端/后端。
- `npm run build`, `npm start`：构建并运行生产后端。后端 `build` 通过 `server/scripts/build-check.js` 对所有源文件做 `node --check` 语法校验，并校验 `openapi.yaml` 顶部声明；不再是 `echo` 占位。
- `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`：ESLint 检查/修复、Prettier 格式化与校验（CI 会运行 `format:check`，提交前请确保通过）。
- `npm test -w client`, `npm test -w server`：Vitest/Jest 单元测试。
- `npm run contract-test`：校验 `server/openapi.yaml` 并检查关键路由契约覆盖。
- `npm run migrate -w server`, `npm run seed -w server`：数据库迁移与初始化。
- `npm run cleanup:message-images -w server`：清理 `server/uploads/message-images/` 中未被任何留言引用的孤儿图片。默认 dry-run 仅打印，加 `-- --apply` 实际删除。建议通过 cron 每日低峰期运行。
- `npm run cleanup:app-icons -w server`：清理 `server/uploads/apps/icons/` 中未被任何未删除应用引用的孤儿图标。默认 dry-run，加 `-- --apply` 实际删除。

## 部署与容器

- `./deploy.sh`：读取 `.env`、构建镜像、启动容器、执行初始化，再做健康检查；`--help` 可查看选项。
- `docker compose up -d --build`：手动部署，可用 `down`、`down -v` 清理。

## 关键环境变量

| 变量                        | 默认            | 说明                                                                                                              |
| --------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | `development`   | 运行模式                                                                                                          |
| `BACKEND_PORT`              | `3000`          | 后端对宿主机暴露的 HTTP/WS 端口                                                                                   |
| `FRONTEND_PORT`             | `5173`          | Vite dev 端口                                                                                                     |
| `APP_PASSWORD`              | 空              | 访问密码；生产环境必须显式配置                                                                                    |
| `APP_AUTH_SECRET`           | 空              | 访问 cookie 签名密钥；生产环境必须单独配置                                                                        |
| `APP_AUTH_TTL_DAYS`         | `30`            | 访问 cookie 有效期（天）                                                                                          |
| `APP_AUTH_COOKIE_SAME_SITE` | `lax`           | 访问 cookie 的 SameSite 设置                                                                                      |
| `VITE_API_BASE`             | `/api`          | 前端打包时的 API 前缀；跨域部署时可设为完整 URL                                                                   |
| `CORS_ORIGIN`               | 空              | 留空时仅放行本地开发来源，生产环境务必显式配置真实域名，**不要使用 `*`**                                          |
| `ENABLE_HTTPS_SECURITY`     | `0`             | 生产启用 HSTS 等更严格安全头                                                                                      |
| `RATE_LIMIT`                | `1000`          | 15 分钟窗口内单 IP 最大请求数                                                                                     |
| `BODY_LIMIT`                | `100mb`         | JSON/urlencoded 请求体大小上限（文件上传走 multer 独立限制）                                                      |
| `FILE_ALLOW_ALL_TYPES`      | `false`         | 文件上传类型防护；默认启用白名单（拒绝 html/svg/js/exe 等，并对图片/压缩包/PDF 做魔数校验）；设为 `true` 关闭防护 |
| `FILE_MAX_UPLOAD_SIZE`      | `1gb`           | 通用上传限制                                                                                                      |
| `WS_MAX_CONNECTIONS`        | `200`           | WebSocket 最大并发连接数                                                                                          |
| `WS_MSG_RATE_LIMIT`         | `30`            | 单连接每秒最大消息数                                                                                              |
| `WS_HEARTBEAT_INTERVAL`     | `30000`         | WebSocket 心跳间隔（毫秒）                                                                                        |
| `LOG_TO_FILE`               | `1`             | 是否写入后端文件日志                                                                                              |
| `LOG_LEVEL`                 | 空              | 可选日志级别覆盖                                                                                                  |
| `VERBOSE_LOGGING`           | `0`             | 是否启用 debug 级别详细日志                                                                                       |
| `TZ`                        | `Asia/Shanghai` | 容器内进程时区；下班计时器按服务器本地日期归属会话并聚合「今日/本周」统计                                         |
| `UPLOADS_CACHE_MAX_AGE`     | `2592000`       | `/uploads` 静态资源的 Cache-Control 有效期（秒），设为 `0` 则禁用缓存                                             |
| `DOCKER_BUILDKIT`           | `1`             | 构建时启用 BuildKit                                                                                               |

## 数据与存储

- **数据库**：`server/data/myweb.db`（SQLite + Knex），使用 `npm run db:setup -w server` 初始化。
- **上传目录**：`server/uploads/{files,wallpapers,apps,message-images}`，Docker volumes `myweb-data`, `myweb-uploads`, `myweb-logs` 保持持久。
- **图标上传压缩**：应用图标上传后服务端就地压缩（`server/src/utils/image-optimize.js`）——等比缩至最大边 256px，输出保持原格式（PNG 透明无损，palette/RGBA 双方案取更小；JPEG q82；WEBP q85；GIF/ICO/BMP/TIFF 原样保留），仅当压缩后更小时替换。
- **API 文档**：`server/openapi.yaml`（Spectral 校验结果输出到 `contract-report.json`）。

## 缓存策略

- **前端构建产物**（`/assets/*`，Vite 内容 hash 文件名）：`public, max-age=31536000, immutable` 一年长缓存，内容变更由 hash 文件名保证 URL 变化。
- **`index.html` 与 SPA 路由 fallback**：`no-cache`，每次经 ETag 协商校验，发版后立即生效（由新版 index.html 引用新的 hash 资源完成版本更替）。
- **`/uploads` 上传资源**：`private, max-age=30天, immutable`（`UPLOADS_CACHE_MAX_AGE` 可调，设 `0` 禁用并返回 `no-store`）。
- **壁纸原图 URL**：文件名为上传时生成的 UUID（内容寻址），URL 不携带版本参数，稳定命中 immutable 缓存；激活切换等非数据变更不会刷新 `updated_at`。
- **壁纸缩略图 API**：`private, max-age=30天, immutable` + 弱 ETag/304 协商缓存；URL 版本参数绑定文件名而非 `updated_at`。
- **API（`/api/*`）**：`no-store`，不缓存（缩略图等自带缓存头的路由在其 handler 内覆盖）。
- **反向代理约定**：Nginx 等反代层**不要**对静态扩展名配置 `expires`/`add_header Cache-Control` 覆盖——这会覆盖应用的 `private` 头（鉴权资源被标记 public）、把 `/assets` 一年缓存降级，并产生双 `Cache-Control` 头。缓存头统一由应用层输出。

## 测试与验证

- `npm test -w client` / `npm test -w server`，可加 `test:cov` 查看覆盖率。
- `npm run contract-test` 先执行 Spectral 校验，再跑一组关键路由契约测试；Spectral 报告写入 `contract-report.json`。

---

如需深入了解各应用、接口、Docker 或部署策略，请直接浏览对应子目录或 OpenAPI 文档。

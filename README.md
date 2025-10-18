# MyWeb - 轻量级多人桌面风格 Web 应用

> 一个功能丰富的、现代化的 Web 应用框架，提供桌面风格的用户体验与多人交互能力。

![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)
![Vue](https://img.shields.io/badge/Vue-3.3+-brightgreen.svg)
![Express](https://img.shields.io/badge/Express-4.18+-blue.svg)
![SQLite](https://img.shields.io/badge/SQLite-3-lightblue.svg)
![Docker](https://img.shields.io/badge/Docker-24+-blue.svg)

## 📋 项目概述

MyWeb 是一个基于 **Vue 3 + Express.js + SQLite** 的全栈 Web 应用框架，通过仿桌面操作系统的界面设计，让用户可以像在本地电脑上一样使用各种应用。项目采用 npm workspaces 管理多个子包，支持本地开发和 Docker 容器化部署。

### 技术栈

| 层级         | 技术           | 版本  | 说明                     |
| ------------ | -------------- | ----- | ------------------------ |
| **前端**     | Vue            | 3.3+  | 渐进式 JavaScript 框架   |
|              | Vite           | 7.1+  | 轻量级前端构建工具       |
|              | Vue Router     | 4.2+  | 单页应用路由管理         |
|              | Vitest         | 0.34+ | 前端单元测试框架         |
| **后端**     | Express.js     | 4.18+ | 轻量级 Web 服务器框架    |
|              | Node.js        | 20+   | JavaScript 运行时        |
|              | Knex.js        | 2.5+  | SQL 查询构建器与迁移工具 |
| **数据库**   | SQLite         | 3     | 轻量级关系数据库         |
|              | better-sqlite3 | 12.4+ | 高性能 SQLite 驱动       |
| **实时通信** | WebSocket (ws) | 8.18+ | 双向通信协议             |
| **部署**     | Docker         | 24+   | 容器化部署               |
|              | Docker Compose | 2.0+  | 容器编排                 |
| **代码质量** | ESLint         | 9.33+ | JavaScript 代码检查      |
|              | Prettier       | 3.6+  | 代码格式化工具           |
|              | Husky          | 9.1+  | Git 钩子管理             |

## 🌟 核心特性

### 1. 桌面化用户界面

- 仿 Windows/macOS 系统的桌面风格设计
- 支持应用窗口的拖拽、最小化、最大化、关闭操作
- 支持图标布局、快捷菜单
- 响应式设计，支持各种屏幕尺寸

### 2. 内置应用生态

| 应用              | 功能描述                                      | 技术特点                                   |
| ----------------- | --------------------------------------------- | ------------------------------------------ |
| 🎵 **音乐播放器** | 本地音频上传、播放、元数据提取、播放列表管理  | ffmpeg 音频处理、music-metadata 元数据解析 |
| 📖 **小说阅读器** | 支持 TXT/DOCX/EPUB 等格式、书签同步、进度保存 | mammoth 文档解析、DOMPurify HTML 清理      |
| 📝 **笔记本**     | 即时便签、分类管理、快速搜索                  | 本地存储、云同步                           |
| 🐍 **贪吃蛇**     | 单人模式、多人对战、实时同步                  | WebSocket 房间管理、游戏状态同步           |
| ⏱️ **工作计时器** | 番茄工作法计时、任务统计、数据可视化          | 时间统计分析                               |
| ⚙️ **计算器**     | 支持复杂数学运算、历史记录                    | 表达式求值                                 |
| 🎮 **五子棋**     | 双人对战、AI 对手、胜负统计                   | 实时棋局同步                               |
| 💬 **消息留言板** | 富文本编辑、图片上传、实时刷新                | 图片存储、富文本渲染                       |

### 3. 多人实时交互

- 基于 WebSocket 的实时通信引擎
- 支持多人游戏房间创建与加入
- 低延迟状态同步
- 离线玩家自动清理

### 4. 文件与媒体管理

- **多格式上传**：图片、文档、音频、视频等
- **文件浏览器**：树形目录展示、文件搜索
- **预览功能**：图片缩略图、文档预览、视频播放
- **壁纸系统**：自定义背景、缩略图生成、分类管理

### 5. 数据持久化

- **数据库**：SQLite 关系数据库，支持复杂查询
- **数据迁移**：Knex.js 版本控制机制
- **上传存储**：支持本地文件系统存储
- **容器化持久化**：Docker volumes 数据卷挂载

### 6. 现代化开发体验

- **快速热重载**：Vite 毫秒级修改反馈
- **类型安全**：JavaScript 代码质量检查
- **自动格式化**：Prettier 风格统一
- **Git 钩子**：Husky 提交前检查
- **单元测试**：Jest/Vitest 测试框架

---

## 📂 项目结构详解

```
myweb/
├── client/                           # 前端 Vue 3 应用
│   ├── src/
│   │   ├── main.js                  # 应用入口
│   │   ├── App.vue                  # 根组件
│   │   ├── apps/                    # 内置应用注册表
│   │   │   ├── registry.js          # 应用注册中心
│   │   │   ├── calculator/          # 计算器应用
│   │   │   ├── music-player/        # 音乐播放器应用
│   │   │   ├── notebook/            # 笔记本应用
│   │   │   ├── novel-reader/        # 小说阅读器应用
│   │   │   ├── snake/               # 贪吃蛇应用
│   │   │   ├── gomoku/              # 五子棋应用
│   │   │   └── work-timer/          # 工作计时器应用
│   │   ├── components/              # Vue 组件库
│   │   │   ├── desktop/             # 桌面容器组件
│   │   │   ├── app/                 # 应用窗口框架组件
│   │   │   ├── common/              # 通用组件（按钮、输入框等）
│   │   │   ├── file/                # 文件管理组件
│   │   │   ├── preview/             # 文件预览组件
│   │   │   ├── wallpaper/           # 壁纸组件
│   │   │   ├── message-board/       # 消息留言板组件
│   │   │   └── multiplayer/         # 多人交互组件
│   │   ├── composables/             # Vue 组合式 API 逻辑复用
│   │   │   ├── useApps.js           # 应用管理逻辑
│   │   │   ├── useAppWindowResize.js # 窗口拖拽缩放
│   │   │   ├── useContextMenu.js    # 右键菜单
│   │   │   ├── useDesktopDropZone.js # 桌面拖拽上传
│   │   │   ├── useAILogs.js         # AI 日志收集
│   │   │   ├── filePreview.js       # 文件预览逻辑
│   │   │   └── ...其他组合式 API
│   │   ├── api/                     # API 客户端
│   │   │   ├── httpClient.js        # Axios 实例配置
│   │   │   ├── files.js             # 文件接口
│   │   │   ├── music.js             # 音乐接口
│   │   │   ├── notebook.js          # 笔记本接口
│   │   │   ├── wallpaper.js         # 壁纸接口
│   │   │   ├── worktimer.js         # 计时器接口
│   │   │   ├── message.js           # 消息接口
│   │   │   ├── bookmarks.js         # 书签接口
│   │   │   └── snake-multiplayer.js # 贪吃蛇多人接口
│   │   ├── services/                # 前端服务层
│   │   ├── store/                   # 状态管理（可选）
│   │   ├── router/                  # 路由配置
│   │   ├── styles/                  # 全局样式
│   │   └── constants/               # 常量定义
│   ├── tests/                       # 前端测试
│   │   ├── unit/                    # 单元测试
│   │   └── setup/                   # 测试配置
│   ├── public/                      # 静态资源
│   │   └── apps/icons/              # 应用图标
│   ├── coverage/                    # 测试覆盖率报告
│   ├── vite.config.js               # Vite 构建配置
│   ├── package.json                 # 前端依赖配置
│   └── index.html                   # HTML 入口
│
├── server/                          # Express 后端服务
│   ├── src/
│   │   ├── server.js                # 服务器启动文件
│   │   ├── app.js                   # Express 应用实例
│   │   ├── appFactory.js            # 应用工厂函数
│   │   ├── config/                  # 配置管理
│   │   │   ├── env.js               # 环境变量解析
│   │   │   └── database.js          # 数据库配置
│   │   ├── constants/               # 常量定义
│   │   │   └── index.js             # 常量汇总
│   │   ├── middleware/              # Express 中间件
│   │   │   ├── errorHandler.js      # 全局错误处理
│   │   │   ├── authentication.js    # 认证中间件
│   │   │   ├── rateLimit.js         # 速率限制
│   │   │   └── logger.js            # 日志中间件
│   │   ├── routes/                  # 路由定义
│   │   │   ├── apps.routes.js       # 应用接口
│   │   │   ├── files.routes.js      # 文件接口
│   │   │   ├── music.routes.js      # 音乐接口
│   │   │   ├── notebook-notes.routes.js # 笔记接口
│   │   │   ├── novel-bookmarks.routes.js # 书签接口
│   │   │   ├── wallpapers.routes.js # 壁纸接口
│   │   │   ├── worktimer.routes.js  # 计时器接口
│   │   │   ├── messages.routes.js   # 消息接口
│   │   │   ├── snake-multiplayer.routes.js # 游戏接口
│   │   │   ├── log.routes.js        # 日志接口
│   │   │   └── internal.logs.routes.js # 内部日志接口
│   │   ├── controllers/             # 路由处理器
│   │   │   ├── files.controller.js
│   │   │   ├── music.controller.js
│   │   │   ├── notebook.controller.js
│   │   │   ├── wallpaper.controller.js
│   │   │   ├── worktimer.controller.js
│   │   │   └── ...其他控制器
│   │   ├── services/                # 业务逻辑层
│   │   │   ├── websocket.service.js # WebSocket 服务
│   │   │   ├── file.service.js      # 文件业务逻辑
│   │   │   ├── music.service.js     # 音乐业务逻辑
│   │   │   ├── wallpaper.service.js # 壁纸业务逻辑
│   │   │   └── ...其他服务
│   │   ├── models/                  # 数据模型
│   │   │   ├── music.model.js       # 音乐数据模型
│   │   │   ├── wallpaper.model.js   # 壁纸数据模型
│   │   │   ├── notebook.model.js    # 笔记数据模型
│   │   │   └── ...其他模型
│   │   ├── db/                      # 数据库连接
│   │   │   ├── index.js             # 数据库实例
│   │   │   └── init.js              # 数据库初始化
│   │   ├── migrations/              # 数据库迁移脚本（Knex）
│   │   │   ├── 001_init_schema.js
│   │   │   └── ...其他迁移
│   │   ├── seeds/                   # 数据库初始化数据
│   │   │   └── seed_default_data.js
│   │   ├── dto/                     # 数据传输对象（验证）
│   │   │   ├── music.dto.js
│   │   │   ├── file.dto.js
│   │   │   └── ...其他 DTO
│   │   ├── utils/                   # 工具函数
│   │   │   ├── file-helper.js       # 文件操作工具
│   │   │   ├── logger.js            # 日志工具（Pino）
│   │   │   ├── health-check.js      # 健康检查
│   │   │   ├── db-check.js          # 数据库检查
│   │   │   └── validators.js        # 验证工具
│   │   └── constants/               # 常量
│   ├── tests/                       # 后端测试
│   │   ├── unit/                    # 单元测试
│   │   ├── app.health.test.js       # 健康检查测试
│   │   ├── apps.routes.test.js      # 应用路由测试
│   │   ├── files.routes.test.js     # 文件路由测试
│   │   ├── music.service.test.js    # 音乐服务测试
│   │   ├── wallpaper.service.test.js # 壁纸服务测试
│   │   └── helpers/                 # 测试辅助函数
│   ├── data/                        # 数据库文件目录
│   │   └── myweb.db                 # SQLite 数据库
│   ├── logs/                        # 日志输出目录
│   │   └── *.log                    # 应用日志
│   ├── uploads/                     # 用户上传文件目录
│   │   ├── files/                   # 普通文件
│   │   ├── music/                   # 音乐文件
│   │   ├── wallpapers/              # 壁纸图片
│   │   ├── novels/                  # 小说文件
│   │   ├── apps/                    # 应用图标
│   │   └── message-images/          # 留言板图片
│   ├── coverage/                    # 测试覆盖率报告
│   ├── knexfile.cjs                 # Knex 迁移配置
│   ├── jest.config.cjs              # Jest 测试配置
│   ├── openapi.yaml                 # REST API 规范文档（OpenAPI 3.0）
│   └── package.json                 # 后端依赖配置
│
├── docs/                            # 文档目录
├── deploy.sh                        # Docker 部署脚本
├── build_myweb_images_tar.sh        # 镜像打包工具
├── docker-compose.yml               # 容器编排配置
├── Dockerfile                       # 多阶段构建文件
├── .env.example                     # 环境变量模板
├── .gitignore                       # Git 忽略文件
├── eslint.config.js                 # ESLint 规则配置
├── jest.config.cjs                  # 根目录 Jest 配置
├── package.json                     # 项目根配置（npm workspaces）
└── README.md                        # 本文件
```

---

## 🚀 快速开始

### 环境要求

| 组件               | 版本 | 说明                    |
| ------------------ | ---- | ----------------------- |
| **Node.js**        | ≥ 20 | 必需，建议最新 LTS 版本 |
| **npm**            | ≥ 9  | 必需，支持 workspaces   |
| **Docker**         | ≥ 24 | 可选，用于容器化部署    |
| **Docker Compose** | 2.0+ | 可选，用于容器编排      |

### 本地开发

#### 1️⃣ 克隆代码并安装依赖

```bash
git clone https://github.com/jopatk123/myweb.git
cd myweb
npm install
```

#### 2️⃣ 准备环境变量

```bash
cp .env.example .env
```

根据需要编辑 `.env` 文件中的关键变量（详见下文环境变量章节）。

#### 3️⃣ 启动开发模式

```bash
npm run dev
```

这将并行启动：

- **前端 Vite dev server**：[http://localhost:3000](http://localhost:3000)
- **后端 Express server**：[http://localhost:3000](http://localhost:3000)（由 `.env` 中的 `BACKEND_PORT` 控制，默认 3000）
- Vite 自动代理 `/api` 和 `/ws` 请求到后端

**单独启动（调试用）**：

```bash
npm run dev:client    # 仅启动前端开发服务器
npm run dev:server    # 仅启动后端开发服务器
```

#### 4️⃣ 验证安装

打开浏览器，访问 [http://localhost:3000](http://localhost:3000)，应该看到 MyWeb 桌面界面。

#### 5️⃣ 生产构建

```bash
# 构建前后端（生成 client/dist）
npm run build

# 本地生产模式运行（需先执行 build）
npm start
```

---

## 📝 常用脚本

### 开发命令

| 命令                 | 说明                          |
| -------------------- | ----------------------------- |
| `npm run dev`        | 并行启动前端与后端开发服务    |
| `npm run dev:client` | 仅启动前端 Vite 开发服务器    |
| `npm run dev:server` | 仅启动后端 Express 开发服务器 |

### 构建与运行

| 命令                   | 说明                                 |
| ---------------------- | ------------------------------------ |
| `npm run build`        | 构建后端+前端（生成 `client/dist/`） |
| `npm run build:client` | 仅构建前端                           |
| `npm run build:server` | 仅构建后端                           |
| `npm start`            | 生产模式启动后端服务                 |

### 代码质量

| 命令                   | 说明                    |
| ---------------------- | ----------------------- |
| `npm run lint`         | ESLint 检查并自动修复   |
| `npm run lint:check`   | ESLint 仅检查不修复     |
| `npm run format`       | Prettier 格式化所有文件 |
| `npm run format:check` | Prettier 检查格式       |

### 测试

| 命令                         | 说明                                |
| ---------------------------- | ----------------------------------- |
| `npm test -w server`         | 运行后端 Jest 测试                  |
| `npm test -w client`         | 运行前端 Vitest 测试                |
| `npm run test:cov -w server` | 后端测试+覆盖率                     |
| `npm run test:cov -w client` | 前端测试+覆盖率                     |
| `npm run contract-test`      | 检查 `server/openapi.yaml` API 规范 |

### 数据库管理（后端专用）

| 命令                                 | 说明                      |
| ------------------------------------ | ------------------------- |
| `npm run migrate -w server`          | 执行数据库迁移            |
| `npm run migrate:rollback -w server` | 回滚上一次迁移            |
| `npm run seed -w server`             | 执行数据库初始化数据      |
| `npm run db:setup -w server`         | 迁移+检查（初始化数据库） |
| `npm run db:check -w server`         | 检查数据库状态            |

---

## 🔧 环境变量配置

### 核心变量

| 变量                    | 默认值           | 说明                               |
| ----------------------- | ---------------- | ---------------------------------- |
| `NODE_ENV`              | `development`    | 运行环境（development/production） |
| `PORT` / `BACKEND_PORT` | `3000` / `10010` | 后端对外暴露端口                   |
| `FRONTEND_PORT`         | `3000`           | 前端 Vite dev 服务器端口           |

### API 与跨域

| 变量                   | 默认值     | 说明                               |
| ---------------------- | ---------- | ---------------------------------- |
| `VITE_API_BASE`        | `/api`     | 前端构建时的 API 基础路径          |
| `DEPLOY_VITE_API_BASE` | _(未设置)_ | 部署脚本专用，覆盖 `VITE_API_BASE` |
| `CORS_ORIGIN`          | `*`        | 后端允许的跨域来源                 |

### 性能与限制

| 变量                        | 默认值   | 说明                 |
| --------------------------- | -------- | -------------------- |
| `RATE_LIMIT`                | `5000`   | 15 分钟内最大请求数  |
| `BODY_LIMIT`                | `2000mb` | 请求体大小限制       |
| `FILE_MAX_UPLOAD_SIZE`      | `1gb`    | 通用文件上传限制     |
| `FILE_MAX_UPLOAD_FILES`     | `100`    | 单次上传文件数量限制 |
| `MUSIC_MAX_UPLOAD_SIZE`     | `1gb`    | 音乐文件上传限制     |
| `MUSIC_MAX_UPLOAD_FILES`    | `300`    | 音乐单次上传数量     |
| `WALLPAPER_MAX_UPLOAD_SIZE` | `300mb`  | 壁纸上传限制         |
| `APP_ICON_MAX_UPLOAD_SIZE`  | `100mb`  | 应用图标上传限制     |
| `MESSAGE_IMAGE_MAX_SIZE`    | `8mb`    | 留言板单图大小限制   |
| `MESSAGE_IMAGE_MAX_FILES`   | `5`      | 留言板单次上传图片数 |

### Docker 与部署

| 变量                      | 默认值      | 说明                   |
| ------------------------- | ----------- | ---------------------- |
| `SKIP_SERVER_NPM_INSTALL` | `0`         | 跳过容器内 npm install |
| `USE_LOCAL_CLIENT`        | `0`         | 使用本地构建的前端产物 |
| `COMPOSE_PROJECT_NAME`    | `myweb`     | Docker Compose 项目名  |
| `DOCKER_BUILDKIT`         | `1`         | 启用 Docker BuildKit   |
| `DOMAIN`                  | `localhost` | 部署域名               |

---

## 📡 API 接口概览

后端提供了 RESTful API 接口和 WebSocket 支持。详细文档见 `server/openapi.yaml`。

### 核心端点

#### 应用管理

- `GET /api/myapps` — 获取已注册的桌面应用列表

#### 文件管理

- `POST /api/files/upload` — 上传文件
- `GET /api/files` — 获取文件列表
- `GET /api/files/:id` — 获取文件详情
- `DELETE /api/files/:id` — 删除文件

#### 音乐管理

- `GET /api/music/tracks` — 获取音乐列表
- `POST /api/music/upload` — 上传音频文件
- `GET /api/music/:id/metadata` — 获取音乐元数据

#### 壁纸管理

- `GET /api/wallpapers` — 获取壁纸列表
- `POST /api/wallpapers/upload` — 上传壁纸
- `GET /api/wallpapers/:id/thumbnail` — 获取缩略图

#### 笔记管理

- `GET /api/notebook/notes` — 获取笔记列表
- `POST /api/notebook/notes` — 创建笔记
- `PUT /api/notebook/notes/:id` — 更新笔记
- `DELETE /api/notebook/notes/:id` — 删除笔记

#### 小说书签

- `GET /api/bookmarks` — 获取所有书签
- `POST /api/bookmarks` — 创建书签
- `PUT /api/bookmarks/:id` — 更新书签
- `DELETE /api/bookmarks/:id` — 删除书签

#### 工作计时

- `GET /api/worktimer/records` — 获取计时记录
- `POST /api/worktimer/records` — 新增计时记录
- `GET /api/worktimer/statistics` — 获取统计信息

#### 消息留言板

- `GET /api/messages` — 获取留言列表
- `POST /api/messages` — 发表留言
- `DELETE /api/messages/:id` — 删除留言

#### 多人游戏

- `GET /api/snake/rooms` — 获取贪吃蛇游戏房间
- `GET /api/snake/rooms/:roomCode` — 获取房间详情
- `WebSocket /ws` — 实时游戏通信

---

## 🐳 Docker 部署

### 方案一：一键部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

脚本会自动执行：

1. 读取 `.env` 环境变量
2. 检查依赖环境
3. 构建 Docker 镜像
4. 启动容器
5. 执行数据库初始化
6. 运行健康检查

**常用选项**：

```bash
./deploy.sh --no-build              # 跳过镜像构建，直接启动
./deploy.sh --force-recreate        # 强制重建容器
./deploy.sh --skip-health-check     # 跳过健康检查
./deploy.sh --health-timeout 300    # 自定义健康检查超时（秒）
```

查看所有选项：

```bash
./deploy.sh --help
```

### 方案二：手动 Docker Compose

```bash
# 加载环境变量并启动容器
export $(cat .env | xargs)
docker compose up -d --build

# 查看日志
docker compose logs -f myweb

# 停止容器
docker compose down

# 完全清理（包括数据卷）
docker compose down -v
```

### 离线镜像打包

用于在不能直接访问互联网的环境中部署：

```bash
chmod +x build_myweb_images_tar.sh
./build_myweb_images_tar.sh -o dist/myweb-images.tar

# 在目标主机加载镜像
docker load < dist/myweb-images.tar

# 启动容器
docker compose up -d
```

---

## 💾 数据与存储

### 数据库

- **位置**：`server/data/myweb.db`（SQLite）
- **初始化**：`npm run db:setup -w server`
- **备份**：直接复制 `.db` 文件或通过 Docker 卷备份

### 用户上传文件

- **位置**：`server/uploads/`
- **子目录**：
  - `files/` — 普通文件
  - `music/` — 音乐文件
  - `wallpapers/` — 壁纸图片
  - `novels/` — 小说文件
  - `apps/` — 应用图标
  - `message-images/` — 留言板图片

### Docker 持久化卷

在 `docker-compose.yml` 中定义：

- `myweb-data` — 数据库存储
- `myweb-uploads` — 用户上传文件
- `myweb-logs` — 应用日志

---

## 🧪 测试

### 前端测试（Vitest）

```bash
# 运行所有前端测试
npm test -w client

# 生成覆盖率报告
npm run test:cov -w client

# 监听模式（自动重运行）
npm run test:watch -w client

# 查看覆盖率报告
open client/coverage/lcov-report/index.html
```

### 后端测试（Jest）

```bash
# 运行所有后端测试
npm test -w server

# 生成覆盖率报告
npm run test:cov -w server

# 监听模式
npm run test:watch -w server

# 查看覆盖率报告
open server/coverage/lcov-report/index.html
```

### API 规范检查

```bash
# 检查 OpenAPI 文档规范
npm run contract-test

# 查看检查结果
cat contract-report.json
```

---

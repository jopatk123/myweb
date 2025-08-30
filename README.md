# MyWeb - 多人桌面

一个类似操作系统桌面背景设置的网页应用，支持上传、管理和随机切换壁纸。

## ✨ 功能特性

- 🖼️ **壁纸管理** - 上传、预览、删除壁纸
- 📁 **分组管理** - 创建分组，对壁纸进行分类
- 🎲 **随机切换** - 支持随机显示不同分组的壁纸
- 🎨 **默认背景** - 优雅的渐变默认背景
- 📱 **响应式设计** - 完美适配桌面和移动端
- 🔒 **安全可靠** - 文件类型验证、大小限制

## 🚀 快速开始

### 开发环境

```bash
# 克隆项目
git clone <repo>
cd myweb

# 一键启动开发环境（基于 schema.js + ensure 自动初始化数据库，无需手动迁移）
chmod +x scripts/dev.sh
./scripts/dev.sh
```

### 数据库重置（开发环境）

开发阶段如需清空测试数据并重新初始化数据库：

```bash
# 停止运行中的脚本（如果在前台运行，Ctrl+C；若在后台，请手动结束）

# 删除数据库文件
rm -f server/data/myweb.db server/data/myweb.db-shm server/data/myweb.db-wal

# 重新启动开发脚本
./scripts/dev.sh
```

启动时后端会通过 `server/src/config/database.js` 调用 `schema.js` 建表，并运行 `ensure*` 兜底逻辑（例如贪吃蛇多人表的 `updated_at`、`end_reason` 等列），保证新库结构完整，无需 Knex 迁移。

### 生产部署

```bash
# Docker 部署（容器启动后由后端自动完成 schema 初始化与 ensure 兜底）
cd docker
docker-compose up -d

# 或手动构建
chmod +x scripts/build.sh
./scripts/build.sh
```

## 🛠️ 技术栈

- **前端**: Vue3 + Vite + Vue Router
- **后端**: Node.js + Express + SQLite
- **部署**: Docker + Nginx
- **文件上传**: Multer
- **数据验证**: Joi

## 📁 项目结构

```
myweb/
├── client/                 # Vue3 前端应用
│   ├── src/
│   │   ├── api/           # API接口
│   │   ├── components/    # 组件
│   │   │   └── wallpaper/ # 壁纸相关组件
│   │   ├── composables/   # 组合式函数
│   │   ├── router/        # 路由配置
│   │   ├── views/         # 页面组件
│   │   └── App.vue
│   └── package.json
├── server/                # Node.js 后端服务
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── models/        # 数据模型
│   │   ├── services/      # 业务逻辑
│   │   ├── routes/        # 路由
│   │   ├── middleware/    # 中间件
│   │   ├── config/        # 配置
│   │   └── utils/         # 工具函数
│   ├── data/             # SQLite数据库
│   ├── uploads/          # 上传文件
│   └── package.json
├── docker/               # Docker配置
├── scripts/              # 构建脚本
└── README.md
```

## 🌐 访问地址

- **开发环境**:
  - 前端: http://localhost:3000
  - 后端API: http://localhost:3302
- **生产环境**:
  - 应用: http://localhost:50001

## 📋 API接口

### 壁纸管理

- `GET /api/wallpapers` - 获取壁纸列表
- `POST /api/wallpapers` - 上传壁纸
- `PUT /api/wallpapers/:id/active` - 设置活跃壁纸
- `DELETE /api/wallpapers/:id` - 删除壁纸
- `GET /api/wallpapers/random` - 随机获取壁纸

### 分组管理

- `GET /api/wallpapers/groups/all` - 获取分组列表
- `POST /api/wallpapers/groups` - 创建分组
- `PUT /api/wallpapers/groups/:id` - 更新分组
- `DELETE /api/wallpapers/groups/:id` - 删除分组

## ⚙️ 环境配置

复制 `.env.example` 为 `.env` 并配置：

```bash
# 前端
VITE_API_BASE=http://localhost:3302
VITE_APP_TITLE=MyWeb

# 后端
PORT=3302
NODE_ENV=development
DB_PATH=./data/myweb.db
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT=100
```

## 🔧 开发指南

### 添加新功能

按照项目规范，新增功能需要：

1. **后端**: 创建 model → service → controller → route
2. **前端**: 创建 api → composable → component → view
3. **路由**: 在 `client/src/router/index.js` 添加路由

### 数据库结构

- `wallpapers` - 壁纸表
- `wallpaper_groups` - 分组表

### 文件上传

- 支持格式: JPG, PNG, GIF, WebP
- 大小限制: 10MB
- 存储路径: `server/uploads/wallpapers/`

## 🐳 Docker 部署

```bash
# 构建并启动
cd docker
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 📝 开发规范

项目遵循 `rule.md` 中定义的规范：

- 文件命名: kebab-case
- 组件命名: PascalCase
- API响应: 统一JSON格式
- 错误处理: 分类处理和日志记录

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feat/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送分支 (`git push origin feat/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

MIT License

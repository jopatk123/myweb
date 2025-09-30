# AI 编程协作规范与工程基线

## 技术基线一览

| 模块         | 推荐组合                                      | 可替换/扩展                               | 备注                                                                      |
| ------------ | --------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| 前端应用层   | Vue 3 + Vite + Element Plus                   | React + Vite / Nuxt / SvelteKit           | 选择支持热更新、组件化、TypeScript 的现代框架；统一使用模块化目录与别名。 |
| 状态与路由   | Pinia + Vue Router                            | Redux Toolkit、Zustand、TanStack Router   | 从业务复杂度出发选择状态方案，避免重复造轮子。                            |
| HTTP 通信    | Axios                                         | `fetch` 封装器、SWR、TanStack Query       | 统一请求封装、错误处理、鉴权头注入与重试策略。                            |
| 样式系统     | Sass + 全局变量注入                           | Tailwind、UnoCSS、CSS Modules             | 保持主题变量与设计体系一致，可通过 Token 驱动设计。                       |
| 前端测试     | Vitest + @vue/test-utils + jsdom              | Jest、Playwright、Cypress                 | 单元、组件与端到端测试需覆盖核心用户流。                                  |
| 代码质量     | ESLint + Prettier + Stylelint（可选）         | Biome、Rome                               | 通过统一脚本执行 lint/format，确保输出一致。                              |
| 后端框架     | Node.js 20 + Express                          | Fastify、NestJS、Koa、Django、Spring Boot | 根据团队栈选择，但需具备中间件生态、RESTful 支持与扩展性。                |
| 数据访问     | SQLite + 自定义迁移                           | Prisma、Knex、TypeORM、PostgreSQL/MySQL   | 默认轻量数据库，可切换为集中式数据库并保留迁移机制。                      |
| 文件与媒体   | Multer + Sharp + exifr                        | Cloud 存储 SDK、FFmpeg、imagekit          | 规划统一的文件目录/云桶结构，避免散落资源。                               |
| 实时能力     | ws (WebSocket)                                | Socket.IO、SSE、MQ                        | 如果需要实时推送，需定义心跳、错误恢复策略。                              |
| 后端测试     | Jest + Supertest                              | Vitest、Mocha、Integration Test 工具      | 至少覆盖服务层和主要 API。                                                |
| 日志与监控   | morgan + rotating-file-stream + 自定义 Logger | Pino、Winston、OpenTelemetry              | 日志需结构化、可轮转，并与告警系统对接。                                  |
| 容器化与部署 | 多阶段 Dockerfile + docker compose            | Kubernetes、Serverless、PaaS              | 需提供基础模板与环境变量约定，支持 CI/CD 集成。                           |

> **落地建议**：默认沿用表格中“推荐组合”，除非业务有明确需求；替换方案需在文档中记录理由、配置差异与额外运维要求。

## 代码风格统一约定

- **格式化与工具链**
  - 全仓库使用 Prettier（缺省配置：2 空格缩进、分号、单引号、自动行宽），通过 `npm run format` 统一执行。
  - ESLint 在根目录管理规则：前端使用 `eslint-plugin-vue`，后端维持 Node 环境规则；如启用 TypeScript，使用 `@typescript-eslint`。
  - Tailwind/设计 Token 等专用风格可在 Stylelint/自定义 lint 中补充校验。
- **命名规范**
  - JavaScript/TypeScript：变量与函数 `camelCase`，常量 `UPPER_SNAKE_CASE`，类/组件 `PascalCase`。
  - Vue 组件文件采用 `PascalCase.vue`，复用逻辑的 `composable` 使用 `useXxx.ts`，工具函数 `xxx.util.ts`。
  - API 路径遵循 RESTful 风格：`/api/v1/resources/:id`，动作性行为使用动词后缀（例如 `/publish`）。
  - Git 分支 `feature/short-description`、`fix/issue-id`，提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org)。
- **代码组织**
  - 目录分层：`components/`, `views/`, `composables/`, `services/`, `store/`, `utils/` 等需职责单一；后端以 `controllers/`, `services/`, `models/`, `routes/` 划分。
  - 严禁在组件/控制器中直接访问底层数据源，必须通过服务层或仓储（Repository）抽象。
- **注释与文档**
  - 复杂逻辑应使用 `//` 行内注释，模块级使用 JSDoc（或 TSDoc）描述参数与返回值。
  - 约定俗成的代码片段（例如补丁、hack）需解释动机与风险，并在跟踪 issue 中注明清除计划。
- **测试风格**
  - 使用 `describe/it` 结构，断言统一使用 `expect`，测试命名清晰表达行为。
  - 提前约定模拟策略（Mock 服务、契约测试或集成测试），避免重复造测试辅助函数。

## 前端协同原则

1. **架构规划**：

- 首屏加载定义明确（小于 100KB gzipped 或按需拆包），使用路由懒加载与手动切分 Vendor。
- 状态管理优先拆分模块与持久化插件（例如 Pinia Persisted State）；跨页面共享逻辑放入 `composables`。

2. **UI 与交互**：

- 统一组件库主题（Element Plus / Ant Design / 自研 Design System），共享 `variables.scss` 或 Token 供多端使用。
- 确保响应式设计：断点定义在 `styles/variables` 中，组件不得硬编码 magic number。

3. **数据通信**：

- Axios 封装应包含：基础 URL、超时、请求/响应拦截、错误弹窗、鉴权令牌刷新。
- 若使用数据拉取库（SWR、TanStack Query），需统一缓存 key 与 Invalidation 策略。

4. **国际化与可访问性**：

- 所有可见文案通过统一 i18n 资源管理；遵遵循 ARIA 规范，组件提供键盘可访问性。

5. **质量保障**：

- 每个关键组件至少一个快照或交互测试；对复杂交互编写 E2E 测试。
- 引入新依赖需评估 bundle 影响并记录在 PR 描述中。

## 后端协同原则

1. **服务结构**：

- 采用分层架构（路由 → 控制器 → 服务 → 仓储/模型），避免耦合。
- 中间件职责单一：鉴权、速率限制、日志、错误处理等模块化复用。

2. **接口设计**：

- 使用 RESTful 风格，必要时补充 GraphQL 或 RPC；所有响应统一结构 `{ success, data, error }`。
- 输入验证统一使用 `Joi` 或 `zod`，错误信息需包含可追踪的错误码。

3. **配置管理**：

- `.env` 定义敏感配置，使用 `dotenv` 或配置中心加载；将默认值抽离到 `config/defaults`。

4. **安全基线**：

- 强制启用 Helmet/CORS/Compression；敏感接口需配合鉴权与审计日志。
- 对文件上传实施类型检查、大小限制、病毒扫描（如必要）。

5. **日志与监控**：

- 日志使用 JSON 结构化输出，包含 `timestamp`, `level`, `requestId`, `userId`（如适用）。
- 重要操作写入操作日志，并与告警系统（Prometheus/Grafana/Sentry）对接。

6. **测试与质量**：

- 单元测试覆盖率目标 ≥ 70%，新增模块需添加正反向用例。
- 提供本地 `npm run test:watch` 与 CI `npm run test:coverage`。

## 数据与存储规范

- **数据库**：
  - 默认 SQLite 适合快速迭代。
- **缓存与队列**：
  - 引入 Redis、RabbitMQ 等需更新部署架构图与 `.env.example`。
- **文件与对象存储**：
  - 文件存储路径/桶命名一致，例如 `uploads/{env}/{module}/`；图片缩略图使用统一命名规则 `<hash>-thumb.jpg`。
  - 保持清理策略，例如定期归档/删除临时文件（可使用 cron/队列）。

## 部署与环境

1. **环境分类**：`local`、`dev`、`staging`、`production` 四层；配置差异写在 `docs/environments.md`。
2. **本地开发**：

- 提供 `npm run install:all`、`npm run dev`、`npm run lint` 等顶层脚本。
- `start.sh` / `stop.sh` 可用于一键启动/停止，需保持幂等。

3. **容器化**：

- Dockerfile 多阶段缓存构建（安装依赖 → 构建前端 → 复制后端），最小化运行层体积。
- docker-compose 提供数据库、缓存、消息队列等可选服务，支持 `.env` 配置端口与卷。

4. **CI/CD**：

- Pipeline 顺序：安装依赖 → Lint → Test → Build → Docker Build/Push → 部署/回滚。
- 所有秘密通过密钥管理服务注入，不写入仓库。

## AI 协作流程

1. **任务准备**：AI 代理在接到需求后，先阅读上下文并建立 Todo；必要时列出假设。
2. **执行原则**：

- 遵循“先测试，再实现”理念：若可能，先补测试，再写功能。
- 所有代码变更必须说明影响范围、风险与验证方式。

3. **验证与回归**：

- 至少运行相关单元测试、lint；若改动影响部署，追加构建或集成测试。

4. **文档同步**：

- 更新 README、API 文档、迁移记录与变更日志（CHANGELOG）。

5. **交付标准**：

- 提交内容包含：代码 diff、验证结果、需求覆盖表、后续工作建议。

---

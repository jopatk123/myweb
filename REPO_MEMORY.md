# Repository Memory

这个文件是当前仓库可被 Git 同步的重要协作记忆。项目相关的经验、约定、坑点和测试结论，统一优先记录在这里，不再依赖个人设备上的临时记忆。

## 记忆策略

- 只记录对项目有重要且长期影响的记忆，避免过度记录导致信息冗余和维护成本增加。
- 项目级的重要记忆只记录到本文件，必要时再同步到 Copilot 的仓库级记忆。
- 不把仓库事实写入个人级记忆，避免多设备开发时信息漂移。
- 新增记忆时优先记录可执行事实：文件位置、约定、已验证结论、回归风险、测试命令。
- 过期记忆直接修改本文件，不保留历史版本，避免信息过时导致误导。

## 当前重要记忆

## 项目定位

- 这是一个 npm workspaces 单仓项目，根目录统一管理 client 与 server 两个子包；根脚本主要负责串联前后端开发、构建、测试与格式化。
- 项目形态是“桌面风格 Web 工作区”：前端提供桌面、窗口和内置应用外壳，后端提供 REST API、静态资源、SQLite 持久化与 WebSocket 能力。
- 核心代码按职责分散在 client、server、shared 三层；shared 目前主要承载前后端共享的内置应用定义，避免前后端各自维护一份元数据。

## 前端架构与约定

- 前端基于 Vue 3 + Vue Router + Vite，入口在 client/src/main.js，根组件在 client/src/App.vue。
- 前端存在访问密码门禁：根组件先判断本地授权状态，再通过后端 auth 接口确认是否启用密码验证；授权缓存键为 myweb_app_auth，有效期 30 天。
- 内置应用注册入口在 client/src/apps/registry.js，应用元信息来源于 shared/builtin-apps.js；新增内置应用时，通常需要同时补共享定义、前端异步组件 loader，以及对应图标资源。
- 应用组件加载使用 defineAsyncComponent，并内置 15 秒超时和一次自动重试；新增应用若加载失败，会回落到 AppLoadError 组件，不是直接白屏。
- 当前共享内置应用 slug 以 calculator、notebook、work-timer、message-board 为准，其中 message-board 默认 visible 为 false。
- 前端 API 层集中在 client/src/api；notebookApi 方法名是 list、create、update、remove，不是 getNotes、createNote、updateNote、deleteNote。
- notebook 相关接口响应有时仍保持 { code, data, message } 包装；前端读取列表或单条记录前，需先解包 data，不要假设 axios 已直接返回业务数组。
- notebook 记录的时间字段在后端或历史数据中可能出现 created_at、updated_at 这类 snake_case 形式，前端展示前需要兼容并归一化。
- notebook 前端逻辑支持 localStorage 回退与紧凑视图持久化，改造该模块时不要只验证服务端在线场景。

## 后端架构与约定

- 后端基于 Express，应用装配核心在 server/src/appFactory.js，启动入口在 server/src/server.js。
- createApp 会统一装配安全与基础中间件：helmet、express-rate-limit、cors、body parser、请求键名归一化、响应 data 键名归一化、uploads 静态资源服务、API 路由、SPA 回退和错误处理中间件。
- 后端通过 server/src/utils/case-helper.js 将请求体和查询参数从 snake_case 归一化为 camelCase；响应只会归一化 body.data 里的对象或数组键名，其他顶层字段不应依赖自动转换。
- 当前主要 API 路由前缀包括 /api/wallpapers、/api/apps、/api/files、/api/notebook、/api/work-timer、/api/messages、/api/auth，内部日志接口使用 /internal/logs。
- 服务端同时托管 client/dist 静态构建结果，并对非 /api/ 路径做 SPA 回退；改动静态资源或路由兜底逻辑时要注意不要破坏 API 404 行为。
- WebSocket 服务在 server/src/server.js 中绑定到 HTTP server，并挂到 app 实例上供控制器使用；涉及实时消息或广播时应先沿着这个入口查实现。
- 认证接口在 server/src/routes/auth.routes.js；若未配置 APP_PASSWORD，后端会直接放行验证。密码校验支持明文和 sha256 哈希比对，并有独立的更严格限流。

## 数据与资源

- 默认数据库为 SQLite，配合 Knex 迁移与 seed 使用；数据文件位于 server/data，上传与业务资源目录位于 server/uploads。
- OpenAPI 入口文件在 server/openapi.yaml，采用拆分引用 openapi/paths 与 openapi/components 的方式维护；接口变更后应同步更新文档而不是只改实现。
- uploads 目录由后端启动阶段自动确保存在；静态缓存策略由环境配置控制，排查资源更新不生效时应先检查 uploads 的 Cache-Control 配置。

## 测试与验证记忆

- 根目录 test 脚本会顺序执行 server 与 client 两侧测试，但定位单测问题时，优先在对应 workspace 内单独运行，避免被另一侧噪音干扰。
- server 侧 Jest 建议使用 npm test -w server -- --runInBand <test-file> 进行定向执行；当前仓库的 ESM 测试初始化在某些运行方式下容易让通用测试执行器失效。
- client 侧 Vitest 定向运行时，路径需要相对 client/；一次性验证建议使用 cd client && npx vitest run <relative-test-path>，避免工作区脚本进入 watch 模式。
- 涉及接口契约时，除了单元或集成测试，还应运行根目录的 contract-test，确认 openapi 文档没有漂移。

## 开发时优先记住的入口

- 新增内置应用：先看 shared/builtin-apps.js，再看 client/src/apps/registry.js，最后补齐对应组件、图标和后端是否需要 API 支撑。
- 调整全局安全、CORS、静态资源或路由回退：先看 server/src/appFactory.js。
- 排查访问密码、免密放行或登录限流：先看 client/src/App.vue、client/src/constants/auth.js 与 server/src/routes/auth.routes.js。
- 调整 notebook：同时检查 client/src/api/notebook.js、对应 composable/组件，以及服务端 /api/notebook 路由，不要只改单侧命名。

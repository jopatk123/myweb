# 通用项目结构规范（AI-Ready）

## Specific project implementation needs to be adjusted according to actual needs;

## 1. 元信息约定（Meta）

| 占位符           | 说明                 | 举例值        |
| ---------------- | -------------------- | ------------- |
| `{{project}}`    | 项目短名(kebab-case) | `awesome-app` |
| `{{Project}}`    | 项目 Pascal 名       | `AwesomeApp`  |
| `{{PORT_FE}}`    | 前端开发服务器端口   | `3000`        |
| `{{PORT_BE}}`    | 后端 API 端口        | `3302`        |
| `{{PORT_NGINX}}` | 生产 Nginx 端口      | `50001`       |
| `{{DB_NAME}}`    | SQLite 文件名        | `awesome.db`  |
| `{{JWT_SECRET}}` | 随机 32 位字符串     | `xxx…`        |

---

## 2. 根目录结构（Root Skeleton）

```
{{project}}/
├── client/                 # 前端
├── server/                 # 后端
├── docker/                 # 部署
├── scripts/                # 一键脚本
├── node_modules/           # 根依赖(若用 monorepo)
├── package.json
├── README.md
└── .gitignore
```

---

## 3. 前端规范（client/）

### 3.1 目录骨架

```
client/
├── src/
│   ├── api/
│   ├── components/
│   │   ├── common/
│   │   ├── {{module}}/    # {{module}}为kebab-case
│   ├── composables/
│   ├── constants/
│   ├── router/
│   ├── services/
│   ├── store/
│   ├── styles/
│   ├── utils/
│   ├── views/
│   ├── App.vue
│   └── main.js
├── public/
├── tests/
├── .env
├── vite.config.js
└── index.html
```

### 3.2 命名规则表

| 类型       | 命名风格             | 模板/示例                                                             |
| ---------- | -------------------- | --------------------------------------------------------------------- |
| 页面组件   | PascalCase           | `UserList.vue`                                                        |
| 通用组件   | PascalCase + 前缀    | `BaseButton.vue`                                                      |
| 业务组件   | 模块前缀 + Pascal    | `OrderDetailCard.vue`（模块前缀为组件目录{{module}}的PascalCase形式） |
| 组合式函数 | camelCase + 前缀 use | `useAuth.js`                                                          |
| 工具函数   | camelCase            | `dateHelper.js`                                                       |
| 常量       | SCREAMING_SNAKE      | `API_TIMEOUT` in `constants/app.js`                                   |
| 常量文件   | camelCase            | `user.js`、`apiConstants.js`（按模块拆分）                            |
| 样式文件   | kebab-case           | `user-profile.scss`                                                   |
| 单元测试   | 同名 + `.test.js`    | `UserList.test.js`                                                    |

### 3.3 变量与参数命名

- **通用约定**：变量和函数参数应使用有语义的驼峰式命名（camelCase），避免在业务逻辑中使用无意义或单字母变量（如 `f`, `g`, `k`），除非在极短的数学循环或临时上下文中（例如 `for (let i = 0; i < n; i++)`）。
- **实体与集合命名**：集合使用复数（`files`、`users`），单个实体使用有意义的单数名（`file`、`user`）。
- **几何/坐标缩写**：表示坐标或向量时允许使用 `x`/`y`/`z`，但宽高建议使用 `width`/`height`（仅在非常局部上下文允许 `w`/`h`）。
- **位置/状态变量**：使用明确命名如 `position`、`pos`、`isLoading`、`isVisible`，避免 `p`、`t` 等模糊缩写。
- **常量命名**：常量请在文件顶部声明并使用大写下划线（SCREAMING_SNAKE），例如 `const BYTES_BASE = 1024;`，不要在函数体内用 `k` 替代。
- **DB 与边界转换**：JS 层内部统一使用 camelCase（例如 `originalName`）；仅在与数据库或外部 API 交互时在边界处转换为 snake_case（例如 `original_name`）。

---

### 3.4 自动生成示例

> 当用户说「新建一个订单管理页面」 → 执行：
>
> 1. 在 `views/` 创建 `OrderManagement.vue`
> 2. 在 `components/order/`（`order`为kebab-case模块名）创建 `OrderTable.vue / OrderFilters.vue`（模块前缀`Order`为`order`的PascalCase形式）
> 3. 在 `composables/` 创建 `useOrders.js`
> 4. 在 `api/` 创建 `order.js` (axios 实例封装)
> 5. 在 `router/` 向 `index.js` 追加 `{ path: '/orders', component: () => import('@/views/OrderManagement.vue') }`

---

## 4. 后端规范（server/）

### 4.1 目录骨架

```
server/
├── src/
│   ├── config/
│   ├── constants/
│   ├── controllers/
│   ├── dto/               # 新增DTO目录
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── data/
├── logs/
├── uploads/
├── tests/
├── .env
└── package.json
```

### 4.2 命名规则表

| 类型     | 命名风格                | 模板/示例                                      |
| -------- | ----------------------- | ---------------------------------------------- |
| 路由文件 | 复数 + `.routes.js`     | `users.routes.js`（复数为kebab-case资源名加s） |
| 控制器   | 资源 + `.controller.js` | `user.controller.js`                           |
| 服务层   | 资源 + `.service.js`    | `user.service.js`                              |
| 模型     | 表名单数 + `.model.js`  | `user.model.js`                                |
| 中间件   | 功能 + `.middleware.js` | `rateLimit.middleware.js`（功能名用camelCase） |
| DTO      | 资源 + `.dto.js`        | `user.dto.js`                                  |
| 工具     | camelCase               | `cryptoHelper.js`                              |
| 测试     | 同名 + `.test.js`       | `user.service.test.js`                         |

### 4.3 数据库模板（SQLite）

- 表名：复数形式，如 `users`, `orders`, `order_items`（采用下划线分隔，符合数据库行业惯例，避免短横线等特殊字符导致的兼容性问题）
- 字段：
  - 主键 `id INTEGER PRIMARY KEY AUTOINCREMENT`
  - 外键 `user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`
  - 时间 `created_at DATETIME`, `updated_at DATETIME`
  - 软删除 `deleted_at DATETIME DEFAULT NULL`
- 索引规范：
  - 高频查询字段必须加索引
  - 外键字段自动创建索引
  - 联合索引字段不超过3个
- AI 根据 `models/*.model.js` 自动生成 `CREATE TABLE` 语句，写入 `data/{{DB_NAME}}`.

---

## 5. Docker 部署规范（docker/）

目录：

```
docker/
├── Dockerfile.client
├── Dockerfile.server
├── docker-compose.yml
├── nginx.conf.template
└── .dockerignore
```

### 5.1 Dockerfile 安全规范

```dockerfile
# 在Dockerfile.server末尾添加
USER node # 避免root运行
```

### 5.2 docker-compose.yml 示例

```yaml
services:
  backend:
    env_file: .env.production
```

---

## 6. 文件创建指令集（Prompt Snippets）

### snippet 1：新建模块

```
当用户要求“增加一个<资源名>模块”时：
1. 将<资源名>转换为kebab-case<res>和PascalCase<Res>。
2. 前端：
   a. client/src/views/<Res>List.vue
   b. client/src/components/<res>/<Res>Table.vue（<Res>为<res>的PascalCase形式）
   c. client/src/composables/use<Res>.js
   d. client/src/api/<res>.js
   e. 在client/src/router/index.js追加路由 { path: '/<res-plural-kebab>', component: () => import('@/views/<Res>List.vue') }
3. 后端：
   a. server/src/models/<res>.model.js
   b. server/src/controllers/<res>.controller.js
   c. server/src/services/<res>.service.js
   d. server/src/routes/<res>s.routes.js（<res>s为<res>的复数形式）
   e. 在server/src/routes/index.js中app.use('/api/<res>s', <res>Routes)
4. 数据库：根据模型字段自动生成CREATE TABLE IF NOT EXISTS <res>s ...（表名用下划线分隔复数形式）
```

### snippet 2：新建通用组件

```
当用户说“新建一个<BaseXxx>组件”：
1. 文件名：client/src/components/common/BaseXxx.vue
2. 必需（最低要求）：props 中应包含组件核心数据（例如 `value` 或 `modelValue`）以及必要的事件发射（例如 `update:value` / `update:modelValue`）以支持 v-model 绑定。
3. 推荐：包含 `label`、`helpText` 等可复用属性，确保组件具有明确的可配置性。
4. 样式：推荐使用局部/模块化样式（CSS Modules / Scoped CSS）以避免全局污染；如果项目统一使用某种方案（如 `<style module>`），在模板中遵守该约定。
5. 文档：为 Base 组件添加简短的 README 或 Storybook 示例，说明 props、事件、插槽与注意事项。
```

### snippet 3：创建DTO和验证

```
当用户要求“添加<资源>数据验证”时：
1. 创建 `server/src/dto/<res>.dto.js`
2. 使用Joi或class-validator声明schema
```

---

## 6.1 数据库迁移、备份与 seed（新增建议）

- **迁移工具推荐**：在项目中使用 `knex`（带 migrations）或 `umzug`（配合 Sequelize / sqlite）来管理 schema 变更。不要直接依赖 AI 自动写入 `CREATE TABLE` 到数据文件，迁移应由可控脚本管理并记录版本。
- **迁移规范**：所有 schema 变更需提供向前与向后迁移脚本（up / down）。迁移文件按时间戳命名并存放 `server/src/migrations/`。
- **备份策略**：定期备份 `data/{{DB_NAME}}`（生产环境应使用托管 DB 并配置自动备份）。在部署前执行备份并保留至少 7 天的备份快照。
- **seed 数据**：在 `server/src/seeds/` 保持必要的初始数据（管理员账户、基础字典）。CI 在集成测试阶段可使用 seed 脚本来初始化内存 sqlite 数据库。
- **本地开发**：提供 `npm run migrate` / `npm run migrate:rollback` 和 `npm run seed` 脚本以便开发者重置数据库状态。

## 6.2 日志与可观测性（新增建议）

- **结构化日志**：使用 `pino` 或 `winston` 输出 JSON 格式日志，字段至少包含 `timestamp`, `level`, `service`, `requestId`, `msg`, `err`（如有）。
- **请求追踪 ID**：在入口中间件注入 `X-Request-Id`（若请求未提供则生成 UUID），并在日志上下文中包含该 ID，便于串联请求链路。
- **性能/指标**：暴露 `/healthz`（Liveness）和 `/ready`（Readiness）端点；采集业务/基础指标（请求量、错误率、平均响应时间）并导出到 Prometheus。
- **集中采集**：建议把日志集中化（ELK / Loki）并把指标推送到 Prometheus，再用 Grafana 建立常用仪表盘与告警规则。
- **错误上下文**：在捕获异常时记录上下文信息（userId, route, payload size 等），但切勿把敏感信息（密码、token）写入日志。

## 7. 环境变量模板（.env.example）

```
# 前端
VITE_API_BASE=http://localhost:{{PORT_BE}}
VITE_APP_TITLE={{Project}}

# 后端
PORT={{PORT_BE}}
NODE_ENV=development
DB_PATH=./data/{{DB_NAME}}
JWT_SECRET={{JWT_SECRET}}
JWT_EXPIRES_IN=1h        # token有效期
CORS_ORIGIN=http://localhost:{{PORT_FE}}
RATE_LIMIT=100           # 每分钟请求限制
```

> 首次创建项目时，把 `.env.example` 拷贝为 `.env` 并替换所有占位符。

---

## 8. README.md 模板

```
# {{Project}}

## Quick Start
\`\`\`bash
git clone <repo>
cd {{project}}
./scripts/dev.sh
\`\`\`

## Tech Stack
- Frontend: Vue3 + Vite + Pinia
- Backend: Node.js + Express + SQLite
- Deploy: Docker + Nginx
```

---

## 9. 工程化配置

### 9.1 Monorepo 配置 (package.json)

```json
{
  "workspaces": ["client", "server"],
  "scripts": {
    "dev:fe": "cd client && npm run dev",
    "dev:be": "cd server && npm run dev",
    "test:fe": "cd client && npm run test:cov",
    "test:be": "cd server && npm run test:cov"
  }
}
```

### 9.2 Git规范

- 分支：`feat/*`, `fix/*`, `chore/*`
- 提交信息格式：`<type>(<scope>): <description>`

### 9.3 统一错误处理

```js
// server/src/middleware/error.js
export default (err, req, res, next) => {
  // 日志记录
  console.error(`[${new Date().toISOString()}] ${err.stack}`);

  // 分类错误处理
  const status = err.status || 500;
  const response = {
    code: status,
    message: status < 500 ? err.message : 'Internal Server Error',
  };

  // 开发环境返回堆栈信息
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};
```

```js
// 在server/src/app.js中使用
import errorHandler from './middleware/error';

// 在所有路由之后注册错误处理中间件
app.use((req, res, next) => {
  res.status(404).json({ code: 404, message: 'Not Found' });
});

app.use(errorHandler);
```

---

## 10. 安全规范

### 10.1 必须启用的中间件

```js
// server/src/app.js
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet());
app.use(express.json({ limit: '10kb' })); // 请求体大小限制

// 速率限制
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: process.env.RATE_LIMIT || 100, // 环境变量控制
  })
);
```

### 10.2 SQL注入防护

- 所有数据库查询必须使用参数化查询
- 禁止直接拼接SQL语句

```js
// 正确示例
db.get('SELECT * FROM users WHERE email = ?', [email]);

// 错误示例
db.get(`SELECT * FROM users WHERE email = '${email}'`);
```

---

## 11. 前后端字段命名与请求归一化

- **约定（推荐 A）**：
  - 客户端请求与接收 JSON 载荷使用 **camelCase**（例如 `groupId`, `userId`）。
  - 后端控制器/服务内部使用 **camelCase**（与 JS 生态一致）。
  - 数据库层使用 **snake_case**（例如 `group_id`、`file_path`），通过 service/model 层的映射进行转换。

- **实现要点**：
  - 在请求进入路由控制器前，使用入口中间件把所有请求键（query/body/form）**统一转换为 camelCase**（仓库中实现为 `server/src/utils/case-helper.js` 的 `normalizeRequestKeys`）。
  - Controller/Service 使用 camelCase 字段，Service 负责把业务字段映射为 DB 列名（snake_case）并调用 Model；Model 保持对数据库列的操作，Service 在必要时把 DB 结果转换为 camelCase 后返回给 Controller。
  - 使用 `normalizeResponseMiddleware` 确保对外返回的 `data` 字段为 camelCase，避免直接泄露 snake_case 列名。

- **兼容性策略**：
  - 本项目为全新启动，建议立即强制客户端使用 camelCase；短期内可在 Service 层对 snake_case 做被动兼容（fallback），但应在文档中声明兼容期并计划逐步移除。
  - multipart/form-data（`multer`）场景需在 controller 局部对 `req.body` 做 snake→camel 转换（可复用 `normalizeKeys`），并确保传入 Service 的字段为 camelCase。

- **中间件顺序建议**（位于 `server/src/app.js`）：
  1. `express.json()` / `express.urlencoded()`（解析请求体）
  2. `normalizeRequestKeys`（将请求键转换为 camelCase）
  3. 认证/校验/路由
  4. `normalizeResponseMiddleware`（确保对外返回 camelCase）

- **文档与契约**：
  - 使用 OpenAPI/Swagger 把所有公共接口字段声明为 camelCase，并在 CI 中校验生成的文档与实现的一致性。

示例工具函数位于 `server/src/utils/case-helper.js`，包含 `snakeToCamel`、`camelToSnake`、`normalizeRequestKeys`、`normalizeResponseMiddleware` 等实用函数，负责键名互转与中间件包装。

中间件加载顺序建议（在 `server/src/app.js`）：

```js
app.use(express.json());
app.use(normalizeRequestToCamel); // 先归一化请求键
// 其它中间件（鉴权、校验、路由）
```

---

## 12. 请求校验、DTO 与错误响应格式

- **DTO 与校验**：后端必须为外部可调用的每个路由维护 DTO（`server/src/dto/*.dto.js`），并使用 Joi / class-validator / Zod 等库做入参校验。
- **优先级**：在路由层或控制器入口处进行校验，失败时返回规范错误，不让控制器内部处理低级别校验细节。

错误响应统一格式（示例）：

```json
{
  "code": 400,
  "message": "请求参数校验失败",
  "errors": [{ "field": "groupId", "message": "必须为整数" }]
}
```

示例：使用 Joi 在 DTO 中声明并在路由中校验

```js
// server/src/dto/wallpaper.dto.js
import Joi from 'joi';

export const moveWallpapersSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  groupId: Joi.alternatives()
    .try(Joi.number().integer().allow(null), Joi.string().allow(''))
    .required(),
});

// 在路由或控制器入口处使用
const { error, value } = moveWallpapersSchema.validate(req.body, {
  convert: true,
});
if (error)
  return res
    .status(400)
    .json({ code: 400, message: '请求参数错误', errors: error.details });
```

---

## 13. API 契约与文档化（强制建议）

- **描述文件**：使用 OpenAPI / Swagger 描述所有公共接口（尤其是关键路径如上传、批量操作），并在 CI 中校验生成的文档。
- **示例**：对 `PUT /api/wallpapers/move` 指明 `ids: integer[]` 与 `groupId: integer|null`，并标注错误响应体格式。

---

## 14. CI / 开发工具与工程化建议

- **静态检查**：项目应启用 `ESLint` + `Prettier`（前端与后端分别配置），并在 CI 中运行 `lint` 阶段阻止不合格提交。
- **提交检查**：使用 `husky` + `commitlint` 强制提交信息格式（`<type>(<scope>): <desc>`）。
- **类型/契约**：如果可能，优先考虑在后端或共享代码中引入 TypeScript 或至少在关键模块使用类型注释，减少运行时错误。
- **测试覆盖**：关键接口（上传、批量移动、批量删除）必须有自动化集成测试（可以使用 sqlite 的内存模式）。

### 14.1 CI/CD 示例流程与质量门槛

- **示例流水线步骤（顺序）**：
  1. checkout
  2. install
  3. lint（前端/后端分别运行 ESLint/Prettier，lint 失败阻止合并）
  4. test（运行单元与集成测试，若能区分则并行执行）
  5. contract-test（校验 OpenAPI 文档与实现的一致性）
  6. build
  7. deploy（仅主分支或带 tag 的构建）

- **质量门槛建议**：
  - 覆盖率阈值：项目整体最低 70%，关键模块（上传、批量操作）建议 85%+。
  - Lint 阈值：所有 new code 必须通过 lint；禁用过多规则前需在 PR 中说明理由。
  - PR 检查：必须包含至少一位代码审阅者批准、CI 通过、并且没有未解决的安全扫描告警（依赖漏洞）。

- **工具建议**：使用 GitHub Actions / GitLab CI / CircleCI，测试阶段可使用 sqlite 内存模式或临时容器化 DB；使用 `swagger-cli` / `openapi-core` 在 CI 中做 contract 校验。

  注意：历史上有工具如 `speccy` 用于 OpenAPI lint，但已不再维护或版本不可用。**推荐使用 Stoplight Spectral（`@stoplight/spectral`）作为现代的 OpenAPI linter**，它维护活跃、规则丰富并支持自定义配置（通过 `.spectral.yml`）。

  简单用法示例（根 package.json 的 `scripts` 中）：

  ```json
  "scripts": {
    "contract-test": "spectral lint server/openapi.yaml --format json > contract-report.json"
  }
  ```

  CI 中可直接调用 `npm run contract-test --if-present` 或使用 `npx`：

  ```bash
  npx @stoplight/spectral lint server/openapi.yaml --format json > contract-report.json || true
  ```

  建议把 `.spectral.yml` 加入仓库以统一规则，并把 `contract-report.json` 上传为 CI artifact 以便审查。

#### 示例：GitHub Actions（简易 CI 模板）

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: npm run lint --if-present
      - name: Test
        run: npm run test --if-present -- --coverage
      - name: Contract check
        run: npm run contract-test --if-present
      - name: Build
        run: npm run build --if-present
```

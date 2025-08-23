# 通用项目结构规范（AI-Ready）

## Specific project implementation needs to be adjusted according to actual needs;

## 1. 元信息约定（Meta）

| 占位符           | 说明                 | 举例值        |
| ---------------- | -------------------- | ------------- |
| `{{project}}`    | 项目短名(kebab-case) | `awesome-app` |
| `{{Project}}`    | 项目 Pascal 名       | `AwesomeApp`  |
| `{{PORT_FE}}`    | 前端开发服务器端口   | `3000`        |
| `{{PORT_BE}}`    | 后端 API 端口        | `3002`        |
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

### 3.3 自动生成示例

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
2. 必须包含props: { value: …, label: … } 和 emit: ['update:value']
3. 样式使用CSS Modules写法 <style module>...
```

### snippet 3：创建DTO和验证

```
当用户要求“添加<资源>数据验证”时：
1. 创建 `server/src/dto/<res>.dto.js`
2. 使用Joi或class-validator声明schema
```

---

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

- **约定**：JSON 载荷（前端 <-> 后端 HTTP 接口）使用 **camelCase** 字段（例如 `groupId`, `userId`）。数据库层使用 **snake_case**（例如 `group_id`）。
- **原因**：JavaScript 生态（前端与 Node）普遍使用 camelCase，数据库/SQL 使用 snake_case 更符合传统与可读性，两者通过明确的归一化层做转换。

- **后端要求**：应当在请求进入控制器前使用中间件把所有请求键统一转换为 camelCase，控制器内统一使用 camelCase；在对外响应（body.data）时也统一转换为 camelCase（已有的 `normalizeResponseMiddleware` 可用于响应处理）。
- **兼容性**：对于外部或历史客户端可能发送的 snake_case 字段，控制器层在短期内可以做容错（同时读取 `groupId` 与 `group_id`），但不应长期依赖此做法，应在文档中强制并升级客户端。

示例：把请求键从 snake_case 转为 camelCase 的中间件（放在 `server/src/middleware/`）：

```js
// server/src/middleware/normalizeRequestToCamel.middleware.js
import { snakeToCamel } from '../utils/case-helper.js';

function convertKeys(obj) {
  if (Array.isArray(obj)) return obj.map(convertKeys);
  if (!obj || typeof obj !== 'object') return obj;
  const res = {};
  for (const [k, v] of Object.entries(obj)) {
    res[snakeToCamel(k)] = convertKeys(v);
  }
  return res;
}

export default function normalizeRequestToCamel(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object')
      req.body = convertKeys(req.body);
    if (req.query && typeof req.query === 'object')
      req.query = convertKeys(req.query);
  } catch (e) {
    console.warn('normalizeRequestToCamel warning:', e?.message || e);
  }
  next();
}
```

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

---

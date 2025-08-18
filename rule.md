```markdown
# 通用项目结构规范（AI-Ready）

---

## 1. 元信息约定（Meta）

| 占位符            | 说明                                               | 举例值          |
| ----------------- | -------------------------------------------------- | --------------- |
| `{{project}}`     | 项目短名(kebab-case)                               | `awesome-app`   |
| `{{Project}}`     | 项目 Pascal 名                                     | `AwesomeApp`    |
| `{{PORT_FE}}`     | 前端开发服务器端口                                 | `3000`          |
| `{{PORT_BE}}`     | 后端 API 端口                                      | `3002`          |
| `{{PORT_NGINX}}`  | 生产 Nginx 端口                                    | `50001`         |
| `{{DB_NAME}}`     | SQLite 文件名                                      | `awesome.db`    |
| `{{JWT_SECRET}}`  | 随机 32 位字符串                                   | `xxx…`          |

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
│   │   ├── {{module}}/
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

| 类型               | 命名风格             | 模板/示例                          |
| ------------------ | -------------------- | ---------------------------------- |
| 页面组件           | PascalCase           | `UserList.vue`                     |
| 通用组件           | PascalCase + 前缀    | `BaseButton.vue`                   |
| 业务组件           | 模块前缀 + Pascal    | `OrderDetailCard.vue`              |
| 组合式函数         | camelCase + 前缀 use | `useAuth.js`                       |
| 工具函数           | camelCase              | `dateHelper.js`                    |
| 常量               | SCREAMING_SNAKE        | `API_TIMEOUT` in `constants/app.js`|
| 样式文件             | kebab-case             | `user-profile.scss`                |
| 单元测试             | 同名 + `.test.js`      | `UserList.test.js`                 |

### 3.3 自动生成示例

> 当用户说「新建一个订单管理页面」 →  执行：  
> 1. 在 `views/` 创建 `OrderManagement.vue`  
> 2. 在 `components/order/` 创建 `OrderTable.vue / OrderFilters.vue`  
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

| 类型       | 命名风格                 | 模板/示例                       |
| ---------- | ------------------------ | ------------------------------- |
| 路由文件   | 复数 + `.routes.js`      | `users.routes.js`               |
| 控制器     | 资源 + `.controller.js`  | `user.controller.js`            |
| 服务层     | 资源 + `.service.js`     | `user.service.js`               |
| 模型       | 表名单数 + `.model.js`   | `user.model.js`                 |
| 中间件     | 功能 + `.middleware.js`  | `auth.middleware.js`            |
| DTO        | 资源 + `.dto.js`         | `user.dto.js`                   | 
| 工具       | kebab-case               | `crypto-helper.js`              |
| 测试       | 同名 + `.test.js`        | `user.service.test.js`          |

### 4.3 数据库模板（SQLite）

- 表名：复数形式，如 `users`, `orders`, `order_items`  
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
   b. client/src/components/<res>/<Res>Table.vue
   c. client/src/composables/use<Res>.js
   d. client/src/api/<res>.js
   e. 在client/src/router/index.js追加路由 { path: '/<res-plural-kebab>', component: () => import('@/views/<Res>List.vue') }
3. 后端：
   a. server/src/models/<res>.model.js
   b. server/src/controllers/<res>.controller.js
   c. server/src/services/<res>.service.js
   d. server/src/routes/<res>s.routes.js
   e. 在server/src/routes/index.js中app.use('/api/<res>s', <res>Routes)
4. 数据库：根据模型字段自动生成CREATE TABLE IF NOT EXISTS <res>s ...
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
    message: status < 500 ? err.message : 'Internal Server Error'
  };

  // 开发环境返回堆栈信息
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}
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
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.RATE_LIMIT || 100 // 环境变量控制
}));
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

## 11. 提交规范

### 11.1 Commitizen配置
```json
// 根目录package.json
{
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  },
  "scripts": {
    "commit": "git-cz"
  }
}
```

### 11.2 提交消息示例
```
feat(auth): add JWT authentication middleware
fix(orders): correct order total calculation
chore(deps): update axios to v1.6.0
docs(readme): add deployment instructions
```

---


import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWallpaperRoutes } from './routes/wallpapers.routes.js';
import { createAppRoutes } from './routes/apps.routes.js';
import { initDatabase } from './config/database.js';
import { createFileRoutes } from './routes/files.routes.js';
import { createNotebookNotesRoutes } from './routes/notebook-notes.routes.js';
import { createWorkTimerRoutes } from './routes/worktimer.routes.js';
import errorHandler from './middleware/error.middleware.js';
import {
  normalizeRequestKeys,
  normalizeResponseMiddleware,
} from './utils/case-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 信任代理设置（在生产环境中使用更精确的配置）
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// 安全中间件
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 速率限制（默认放宽以避免本地调试时频繁触发 429）
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    // 使用环境变量 RATE_LIMIT 覆盖；默认 1000 次/15 分钟
    max: Number(process.env.RATE_LIMIT || 1000),
    // 返回更标准的速率限制头部，并禁用旧的遗留头部
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// CORS配置
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// 请求体解析 - 放开大小限制
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// 统一请求键名（snake_case 或 camelCase -> camelCase），便于后端控制器/服务使用 camelCase
app.use(normalizeRequestKeys);

// 响应归一化：确保对外返回的 data 字段为 camelCase（若 controller 返回的是 DB row）
app.use(normalizeResponseMiddleware);

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 初始化数据库
const db = await initDatabase();

// 路由
app.use('/api/wallpapers', createWallpaperRoutes(db));
app.use('/api/apps', createAppRoutes(db));
app.use('/api/files', createFileRoutes(db));
app.use('/api/notebook', createNotebookNotesRoutes(db));
app.use('/api/work-timer', createWorkTimerRoutes(db));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: 'Not Found',
    path: req.path,
  });
});

// 错误处理中间件
app.use(errorHandler);

export default app;

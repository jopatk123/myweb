import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWallpaperRoutes } from './routes/wallpapers.routes.js';
import { initDatabase } from './config/database.js';
import errorHandler from './middleware/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 速率限制
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.RATE_LIMIT || 100
}));

// CORS配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// 请求体解析
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 初始化数据库
const db = await initDatabase();

// 路由
app.use('/api/wallpapers', createWallpaperRoutes(db));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404处理
app.use((req, res, next) => {
  res.status(404).json({ 
    code: 404, 
    message: 'Not Found',
    path: req.path
  });
});

// 错误处理中间件
app.use(errorHandler);

export default app;
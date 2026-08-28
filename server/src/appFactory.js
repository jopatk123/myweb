import './config/loadRepoEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './config/database.js';
import { appEnv, isCorsOriginAllowed } from './config/env.js';
import { createWallpaperRoutes } from './routes/wallpapers.routes.js';
import { createAppRoutes } from './routes/apps.routes.js';
import { createFileRoutes } from './routes/files.routes.js';
import { createNotebookNotesRoutes } from './routes/notebook-notes.routes.js';
import { createWorkTimerRoutes } from './routes/worktimer.routes.js';
import { createMessageRoutes } from './routes/messages.routes.js';
import { createAuthRoutes } from './routes/auth.routes.js';
import { createInternalLogsRoutes } from './routes/internal-logs.routes.js';
import errorHandler from './middleware/error.middleware.js';
import {
  normalizeRequestKeys,
  normalizeResponseMiddleware,
} from './utils/case-helper.js';
import { createAppAuthGuard } from './middleware/appAuth.middleware.js';
import { createRequestLogMiddleware } from './middleware/requestLog.middleware.js';
import { setDb } from './utils/dbPool.js';
import { createUploadDirs } from './utils/file-helper.js';
import logger from './utils/logger.js';

const appLogger = logger.child('AppFactory');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildContentSecurityPolicy(enableHttpsSecurity) {
  const connectOrigins = new Set(["'self'", 'ws:', 'wss:']);
  const configuredApiBases = [
    process.env.DEPLOY_VITE_API_BASE,
    process.env.VITE_API_BASE,
  ];

  configuredApiBases.forEach(rawBase => {
    const value = String(rawBase || '').trim();
    if (!/^https?:\/\//i.test(value)) return;

    try {
      const url = new URL(value);
      connectOrigins.add(`${url.protocol}//${url.host}`);
      connectOrigins.add(
        `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`
      );
    } catch {
      // Ignore malformed optional API base overrides.
    }
  });

  const directives = {
    defaultSrc: ["'self'"],
    // 'unsafe-inline' 仅保留给样式（CSS-in-JS 常规需求）；脚本侧不允许内联
    styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
    // 移除 'unsafe-inline' 和 'unsafe-eval'，防止 XSS 注入执行
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    fontSrc: ["'self'", 'https:', 'data:'],
    connectSrc: [...connectOrigins],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", 'blob:'],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    scriptSrcAttr: ["'none'"],
    workerSrc: ["'self'", 'blob:'],
  };

  if (enableHttpsSecurity) {
    directives.upgradeInsecureRequests = [];
  } else {
    directives.upgradeInsecureRequests = null;
  }

  return directives;
}

function resolveCorsOptions() {
  return {
    credentials: true,
    origin(origin, callback) {
      // 拒绝无 origin 的跨域请求（服务端调用等本地直接请求除外）
      // 无 origin 头时说明是同源请求或服务端请求，直接放行
      if (!origin) {
        // 没有 origin 意味着同源请求，允许
        return callback(null, true);
      }

      if (appEnv.cors.allowAll || isCorsOriginAllowed(origin)) {
        return callback(null, true);
      }

      appLogger.warn('CORS origin denied', { origin });
      return callback(null, false);
    },
  };
}

export async function createApp(options = {}) {
  const {
    db: providedDb,
    dbPath,
    seedBuiltinApps = true,
    silentDbLogs = appEnv.isTest,
    // 生产环境使用真实前端构建产物；测试可注入临时目录避免触碰真实 dist
    clientDistDir: providedClientDistDir,
  } = options;

  const app = express();

  // 仅信任 loopback 反代（同机 nginx 等）。不信任 uniquelocal/linklocal：
  // 否则局域网直连客户端可伪造 X-Forwarded-For 伪造 req.ip，绕过按 IP 的登录限流。
  app.set('trust proxy', 'loopback');

  await createUploadDirs();

  const enableHttpsSecurity = appEnv.enableHttpsSecurity;
  const contentSecurityPolicyDirectives =
    buildContentSecurityPolicy(enableHttpsSecurity);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: contentSecurityPolicyDirectives,
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: enableHttpsSecurity ? undefined : false,
    })
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: appEnv.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(cors(resolveCorsOptions()));

  const bodyLimit = appEnv.bodyLimit;

  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  app.use(normalizeRequestKeys);
  app.use(normalizeResponseMiddleware);
  app.use(createRequestLogMiddleware());

  const uploadsDir = path.join(__dirname, '../uploads');
  const requireAppAuth = createAppAuthGuard();
  const uploadsCacheSeconds = Math.max(
    0,
    Number(appEnv.staticAssets.uploadsCacheMaxAgeSeconds) || 0
  );
  app.use(
    '/uploads',
    requireAppAuth,
    express.static(uploadsDir, {
      maxAge: uploadsCacheSeconds * 1000,
      etag: true,
      setHeaders(res, filePath) {
        if (uploadsCacheSeconds > 0) {
          res.setHeader(
            'Cache-Control',
            `private, max-age=${uploadsCacheSeconds}, immutable`
          );
        } else {
          res.setHeader('Cache-Control', 'no-store');
        }
        // 统一强制下载：防止浏览器直接渲染 SVG/HTML 等可执行内容导致存储型 XSS。
        // <img src>/<video src> 等引用不受影响，仍可正常加载。
        const basename = path.basename(filePath);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(basename)}"`
        );
      },
    })
  );

  const db =
    providedDb ||
    (await initDatabase({
      dbPath,
      seedBuiltinApps,
      silent: silentDbLogs,
    }));
  setDb(db);

  // API 响应默认禁止缓存：数据均为实时同步型，避免被浏览器/代理持久化。
  // 自带缓存头的路由（如壁纸缩略图）会在 handler 内用 res.set 覆盖该头。
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use('/api/wallpapers', requireAppAuth, createWallpaperRoutes(db));
  app.use('/api/apps', requireAppAuth, createAppRoutes(db));
  app.use('/api/files', requireAppAuth, createFileRoutes(db));
  app.use('/api/notebook', requireAppAuth, createNotebookNotesRoutes(db));
  app.use('/api/work-timer', requireAppAuth, createWorkTimerRoutes(db));
  app.use('/api/messages', requireAppAuth, createMessageRoutes(db));
  app.use('/api/auth', createAuthRoutes());

  app.use('/internal/logs', requireAppAuth, createInternalLogsRoutes());

  // /api 仅在非生产环境作为开发期导航返回端点列表，生产环境不暴露
  if (!appEnv.isProduction) {
    app.get('/api', (req, res) => {
      res.json({
        message: 'MyWeb API Server',
        version: '1.0.0',
        endpoints: {
          wallpapers: '/api/wallpapers',
          apps: '/api/apps',
          files: '/api/files',
          notebook: '/api/notebook',
          workTimer: '/api/work-timer',
          messages: '/api/messages',
        },
      });
    });
  }

  const clientDistDir =
    providedClientDistDir || path.join(__dirname, '../../client/dist');

  // 带内容 hash 的构建产物（Vite assets/*-[hash].js）：内容变更必然导致文件名变化，
  // 可安全使用一年 immutable 长缓存，老用户二次访问直接命中磁盘缓存零请求
  app.use(
    '/assets',
    express.static(path.join(clientDistDir, 'assets'), {
      etag: true,
      setHeaders(res) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    })
  );

  // SPA 其余静态文件（index.html、public 根下未 hash 的图标等）：
  // 强制协商缓存（no-cache 仍可走 ETag 304），发版后 index.html 立即生效，
  // 由其引用的新 hash 资源名完成版本更替，杜绝浏览器启发式缓存导致的旧版残留
  app.use(
    express.static(clientDistDir, {
      etag: true,
      setHeaders(res) {
        res.setHeader('Cache-Control', 'no-cache');
      },
    })
  );

  // 健康检查：仅返回存活状态，不暴露时间戳等元数据
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });

  app.use((req, res) => {
    res.status(404).json({
      code: 404,
      message: 'Not Found',
      path: req.path,
    });
  });

  app.use(errorHandler);

  return { app, db };
}

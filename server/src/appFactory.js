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
        // 不附带 Origin 头的请求（如直接 curl 或同源），允许通过
        // 但若配置了严格来源列表，仍拒绝无 origin 跨域请求
        if (appEnv.cors.allowAll) return callback(null, true);
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
  } = options;

  const app = express();

  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

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
      setHeaders(res) {
        if (uploadsCacheSeconds > 0) {
          res.setHeader(
            'Cache-Control',
            `private, max-age=${uploadsCacheSeconds}, immutable`
          );
        } else {
          res.setHeader('Cache-Control', 'no-store');
        }
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

  app.use('/api/wallpapers', requireAppAuth, createWallpaperRoutes(db));
  app.use('/api/apps', requireAppAuth, createAppRoutes(db));
  app.use('/api/files', requireAppAuth, createFileRoutes(db));
  app.use('/api/notebook', requireAppAuth, createNotebookNotesRoutes(db));
  app.use('/api/work-timer', requireAppAuth, createWorkTimerRoutes(db));
  app.use('/api/messages', requireAppAuth, createMessageRoutes(db));
  app.use('/api/auth', createAuthRoutes());

  app.use('/internal/logs', requireAppAuth, createInternalLogsRoutes());

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

  app.use(express.static(path.join(__dirname, '../../client/dist')));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
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

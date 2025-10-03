import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './config/database.js';
import { createWallpaperRoutes } from './routes/wallpapers.routes.js';
import { createAppRoutes } from './routes/apps.routes.js';
import { createFileRoutes } from './routes/files.routes.js';
import { createNotebookNotesRoutes } from './routes/notebook-notes.routes.js';
import { createWorkTimerRoutes } from './routes/worktimer.routes.js';
import { createNovelBookmarkRoutes } from './routes/novel-bookmarks.routes.js';
import { createSnakeMultiplayerRoutes } from './routes/snake-multiplayer.routes.js';
import messageRoutes from './routes/messages.routes.js';
import { createInternalLogsRoutes } from './routes/internal.logs.routes.js';
import { createMusicRoutes } from './routes/music.routes.js';
import errorHandler from './middleware/error.middleware.js';
import {
  normalizeRequestKeys,
  normalizeResponseMiddleware,
} from './utils/case-helper.js';
import { setDb } from './utils/dbPool.js';
import { createUploadDirs } from './utils/file-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildContentSecurityPolicy(enableHttpsSecurity) {
  const directives = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'https:', 'data:'],
    connectSrc: ["'self'", 'ws:', 'wss:'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    scriptSrcAttr: ["'none'"],
  };

  if (enableHttpsSecurity) {
    directives.upgradeInsecureRequests = [];
  } else {
    directives.upgradeInsecureRequests = null;
  }

  return directives;
}

function resolveCorsOptions() {
  const raw = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim());
  const configuredOrigins = raw.filter(Boolean);

  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];

  const allowAll = configuredOrigins.includes('*');
  const allowlist = allowAll
    ? []
    : configuredOrigins.length > 0
      ? configuredOrigins
      : defaultOrigins;

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowAll || allowlist.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS origin denied: ${origin}`);
      return callback(null, false);
    },
  };
}

export async function createApp(options = {}) {
  const {
    db: providedDb,
    dbPath,
    seedBuiltinApps = true,
    silentDbLogs = process.env.NODE_ENV === 'test',
  } = options;

  const app = express();

  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

  await createUploadDirs();

  const enableHttpsSecurity = process.env.ENABLE_HTTPS_SECURITY === '1';
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
      max: Number(process.env.RATE_LIMIT || 1000),
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(cors(resolveCorsOptions()));

  const bodyLimit = process.env.BODY_LIMIT || '100mb';

  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  app.use(normalizeRequestKeys);
  app.use(normalizeResponseMiddleware);

  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  const db =
    providedDb ||
    (await initDatabase({
      dbPath,
      seedBuiltinApps,
      silent: silentDbLogs,
    }));
  setDb(db);

  app.use('/api/wallpapers', createWallpaperRoutes(db));
  app.use('/api/myapps', createAppRoutes(db));
  app.use('/api/files', createFileRoutes(db));
  app.use('/api/notebook', createNotebookNotesRoutes(db));
  app.use('/api/work-timer', createWorkTimerRoutes(db));
  app.use('/api/novel-bookmarks', createNovelBookmarkRoutes(db));
  app.use('/api/music', createMusicRoutes(db));
  app.use('/api/snake-multiplayer', createSnakeMultiplayerRoutes());
  app.use('/api/messages', messageRoutes);

  app.use('/internal/logs', createInternalLogsRoutes());

  app.get('/api', (req, res) => {
    res.json({
      message: 'MyWeb API Server',
      version: '1.0.0',
      endpoints: {
        wallpapers: '/api/wallpapers',
        apps: '/api/myapps',
        files: '/api/files',
        notebook: '/api/notebook',
        workTimer: '/api/work-timer',
        novelBookmarks: '/api/novel-bookmarks',
        music: '/api/music',
        snakeMultiplayer: '/api/snake-multiplayer',
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

import path from 'path';
import { fileURLToPath } from 'url';
import { parseEnvNumber, parseEnvBoolean } from '../utils/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CORS_ORIGINS = Object.freeze([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function splitAndTrim(value = '') {
  return String(value)
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function resolveCorsConfig(rawValue) {
  const configured = splitAndTrim(rawValue);
  const allowAll = configured.includes('*');
  const effective = allowAll
    ? []
    : configured.length > 0
      ? configured
      : [...DEFAULT_CORS_ORIGINS];

  return {
    configured,
    allowAll,
    effective,
    defaults: DEFAULT_CORS_ORIGINS,
  };
}

function resolveLogConfig(raw) {
  const nodeEnv = raw.NODE_ENV ?? 'development';
  const directory = raw.LOG_DIR
    ? path.resolve(raw.LOG_DIR)
    : path.join(__dirname, '../../logs');

  const file = raw.LOG_FILE
    ? path.resolve(raw.LOG_FILE)
    : path.join(directory, 'server.log');

  return {
    directory,
    file,
    toFile: raw.LOG_TO_FILE !== '0' && nodeEnv !== 'test',
    level: raw.LOG_LEVEL || null,
    forceColor: raw.FORCE_COLOR === '1',
  };
}

const rawEnv = process.env;
const nodeEnv = rawEnv.NODE_ENV ?? 'development';
const cors = resolveCorsConfig(rawEnv.CORS_ORIGIN);
const port = parseEnvNumber('PORT', parseEnvNumber('BACKEND_PORT', 3000));
const rateLimitMax = parseEnvNumber('RATE_LIMIT', 1000);
const bodyLimit = rawEnv.BODY_LIMIT || '100mb';
const enableHttpsSecurity = rawEnv.ENABLE_HTTPS_SECURITY === '1';
const logConfig = resolveLogConfig(rawEnv);
const databaseDefaultFile = path.join(__dirname, '../../data/myweb.db');
const snakeCleanupDebug = Boolean(rawEnv.SNAKE_CLEANUP_DEBUG);
const uploadsCacheMaxAgeSeconds = parseEnvNumber(
  'UPLOADS_CACHE_MAX_AGE',
  60 * 60 * 24 * 30
);

export const appEnv = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test',
  port,
  rateLimitMax,
  bodyLimit,
  enableHttpsSecurity,
  cors: Object.freeze(cors),
  log: Object.freeze(logConfig),
  database: Object.freeze({
    path: rawEnv.DB_PATH || null,
    defaultFile: databaseDefaultFile,
  }),
  staticAssets: Object.freeze({
    uploadsCacheMaxAgeSeconds,
  }),
  snake: Object.freeze({
    cleanupDebug: snakeCleanupDebug,
  }),
});

export function resolveDatabasePath(overridePath) {
  if (overridePath) return overridePath;
  if (process.env.DB_PATH) return process.env.DB_PATH;
  return appEnv.database.defaultFile;
}

export function applyDatabasePathOverride(overridePath) {
  if (!overridePath) return;
  process.env.DB_PATH = overridePath;
}

export function isCorsOriginAllowed(origin) {
  if (!origin) return true;
  if (appEnv.cors.allowAll) return true;
  return appEnv.cors.effective.includes(origin);
}

export function getCorsEffectiveOrigins() {
  return appEnv.cors.allowAll ? ['*'] : [...appEnv.cors.effective];
}

export function getAdminTokenConfig(envVar) {
  const token = rawEnv[envVar] || '';
  const tokenHash = rawEnv[`${envVar}_HASH`] || '';
  return {
    token,
    tokenHash,
  };
}

export function shouldLogVerbose() {
  return parseEnvBoolean('VERBOSE_LOGGING', false);
}

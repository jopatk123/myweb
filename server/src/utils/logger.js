import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { appEnv, shouldLogVerbose } from '../config/env.js';

// Bridge implementation using pino but keeping the previous public API

function resolveLevel() {
  if (shouldLogVerbose()) return 'debug';
  if (appEnv.log.level) return appEnv.log.level;
  if (appEnv.isProduction) return 'info';
  if (appEnv.isTest) return 'error';
  return 'debug';
}

function ensureLogDirectory(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
}

const baseLogDir = appEnv.log.directory || path.join(process.cwd(), 'logs');
if (appEnv.log.toFile) {
  ensureLogDirectory(baseLogDir);
}

const pinoOptions = {
  level: resolveLevel(),
  timestamp: pino.stdTimeFunctions.isoTime,
};

let destination = undefined;
if (appEnv.log.toFile) {
  const logFile = appEnv.log.file || path.join(baseLogDir, 'server.log');
  destination = pino.destination({ dest: logFile, sync: false });
}

const pinoInstance = destination
  ? pino(pinoOptions, destination)
  : pino(pinoOptions);

// Simple Logger wrapper to remain compatible with existing API
export class Logger {
  constructor(options = {}) {
    const name = options.module || options.name || 'app';
    this._child = pinoInstance.child({ module: name });
  }

  debug(msg, meta) {
    if (meta !== undefined) this._child.debug(meta, msg);
    else this._child.debug(msg);
  }

  info(msg, meta) {
    if (meta !== undefined) this._child.info(meta, msg);
    else this._child.info(msg);
  }

  warn(msg, meta) {
    if (meta !== undefined) this._child.warn(meta, msg);
    else this._child.warn(msg);
  }

  error(msg, meta) {
    if (meta instanceof Error) {
      this._child.error({ err: meta }, msg);
    } else if (meta !== undefined) {
      this._child.error(meta, msg);
    } else {
      this._child.error(msg);
    }
  }

  child(moduleName) {
    return new Logger({ module: moduleName });
  }
}

export function createLogger(moduleName = 'app', options = {}) {
  const l = new Logger({ module: moduleName, ...options });
  return l;
}

export const logger = createLogger('Server');

export default logger;

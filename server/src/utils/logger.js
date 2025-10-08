/* eslint-disable no-control-regex */
/**
 * 统一日志工具
 * 提供环境感知的日志级别控制和格式化输出
 */
import fs from 'fs';
import path from 'path';
import { appEnv, shouldLogVerbose } from '../config/env.js';

const DEFAULT_LOG_FILE = appEnv.log.file;

let sharedFileStream = null;

function ensureLogFileStream(filePath = DEFAULT_LOG_FILE) {
  const directory = path.dirname(filePath);
  try {
    fs.mkdirSync(directory, { recursive: true });
  } catch (err) {
    console.error('Failed to ensure log directory:', err);
  }

  if (!sharedFileStream || sharedFileStream.path !== filePath) {
    sharedFileStream?.end();
    sharedFileStream = fs.createWriteStream(filePath, { flags: 'a' });
  }

  return sharedFileStream;
}

function normalizeLogLevel(level) {
  if (typeof level === 'number' && Number.isFinite(level)) {
    return Math.min(Math.max(level, LogLevel.DEBUG), LogLevel.NONE);
  }

  if (typeof level === 'string') {
    const upper = level.trim().toUpperCase();
    if (LogLevel[upper] !== undefined) {
      return LogLevel[upper];
    }
    const parsed = Number(upper);
    if (!Number.isNaN(parsed)) {
      return Math.min(Math.max(parsed, LogLevel.DEBUG), LogLevel.NONE);
    }
  }

  return null;
}

function errorToJson(err) {
  if (!err) {
    return err;
  }

  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    cause:
      err.cause && typeof err.cause === 'object'
        ? errorToJson(err.cause)
        : err.cause,
  };
}

function serializeMeta(meta) {
  if (meta === undefined || meta === null) {
    return null;
  }

  if (typeof meta === 'string') {
    return meta;
  }

  if (meta instanceof Error) {
    return JSON.stringify(errorToJson(meta));
  }

  if (typeof meta === 'object') {
    try {
      return JSON.stringify(
        meta,
        (_key, value) => {
          if (value instanceof Error) {
            return errorToJson(value);
          }
          return value;
        },
        0
      );
    } catch (err) {
      return JSON.stringify({
        serializationError: err.message,
      });
    }
  }

  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

const shouldLogToFile = appEnv.log.toFile;

const defaultColorsEnabled = appEnv.log.forceColor
  ? true
  : appEnv.isProduction
    ? false
    : Boolean(process.stdout && process.stdout.isTTY);

/**
 * 日志级别枚举
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

/**
 * 日志级别名称映射
 */
const LOG_LEVEL_NAMES = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * 日志级别颜色（ANSI终端颜色）
 */
const LOG_COLORS = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m', // Green
  [LogLevel.WARN]: '\x1b[33m', // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  RESET: '\x1b[0m',
};

/**
 * Logger 类
 */
export class Logger {
  constructor(options = {}) {
    this.module = options.module || 'App';
    this.minLevel = this.resolveMinLevel(options.minLevel);
    this.enableColors =
      options.enableColors !== undefined
        ? options.enableColors
        : defaultColorsEnabled;
    this.enableTimestamp = options.enableTimestamp !== false;
    this.fileStream = options.fileStream || null;
  }

  /**
   * 解析最小日志级别
   */
  resolveMinLevel(level) {
    if (level !== undefined) {
      const normalized = normalizeLogLevel(level);
      if (normalized !== null) {
        return normalized;
      }
    }

    // 根据环境变量确定日志级别
    const env = appEnv.nodeEnv;
    const logLevelEnv = appEnv.log.level;

    if (shouldLogVerbose()) {
      return LogLevel.DEBUG;
    }

    if (logLevelEnv) {
      const upperLevel = logLevelEnv.toUpperCase();
      if (LogLevel[upperLevel] !== undefined) {
        return LogLevel[upperLevel];
      }
    }

    // 默认值：测试环境只显示错误，开发环境显示所有，生产环境显示info及以上
    if (env === 'test') {
      return LogLevel.ERROR;
    } else if (env === 'production') {
      return LogLevel.INFO;
    } else {
      return LogLevel.DEBUG;
    }
  }

  /**
   * 格式化时间戳
   */
  formatTimestamp() {
    return new Date().toISOString();
  }

  /**
   * 格式化日志消息
   */
  formatMessage(level, message, meta) {
    const parts = [];

    // 时间戳
    if (this.enableTimestamp) {
      parts.push(`[${this.formatTimestamp()}]`);
    }

    // 日志级别
    const levelName = LOG_LEVEL_NAMES[level] || 'UNKNOWN';
    if (this.enableColors) {
      const color = LOG_COLORS[level] || '';
      parts.push(`${color}${levelName}${LOG_COLORS.RESET}`);
    } else {
      parts.push(levelName);
    }

    // 模块名称
    if (this.module) {
      parts.push(`[${this.module}]`);
    }

    // 消息内容
    parts.push(message);

    // 元数据
    if (meta !== undefined && meta !== null) {
      const serialized = serializeMeta(meta);
      if (serialized) {
        parts.push(serialized);
      }
    }

    return parts.join(' ');
  }

  /**
   * 核心日志方法
   */
  log(level, message, meta = {}) {
    // 级别过滤
    if (level < this.minLevel) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);

    // 输出到控制台
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }

    // 输出到文件（如果配置了文件流）
    if (!this.fileStream && shouldLogToFile) {
      this.fileStream = ensureLogFileStream();
    }

    if (this.fileStream && this.fileStream.writable) {
      try {
        // 移除颜色代码用于文件输出
        const plainMessage = formattedMessage.replace(/\x1b\[\d+m/g, '');
        this.fileStream.write(plainMessage + '\n');
      } catch (err) {
        console.error('Failed to write to log file:', err.message);
      }
    }
  }

  /**
   * Debug 日志
   */
  debug(message, meta) {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Info 日志
   */
  info(message, meta) {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Warning 日志
   */
  warn(message, meta) {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Error 日志
   */
  error(message, meta) {
    // 如果meta是Error对象，提取有用信息
    if (meta instanceof Error) {
      meta = {
        message: meta.message,
        stack: meta.stack,
        code: meta.code,
        ...meta,
      };
    }
    this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * 创建子logger（带模块名称）
   */
  child(moduleName) {
    return new Logger({
      module: moduleName,
      minLevel: this.minLevel,
      enableColors: this.enableColors,
      enableTimestamp: this.enableTimestamp,
      fileStream: this.fileStream,
    });
  }
}

/**
 * 创建默认logger实例
 */
export const createLogger = (module = 'App', options = {}) => {
  const fileStream =
    options.fileStream !== undefined
      ? options.fileStream
      : shouldLogToFile
        ? ensureLogFileStream()
        : null;

  return new Logger({ module, ...options, fileStream });
};

/**
 * 全局默认logger
 */
export const logger = createLogger('Server');

export default logger;

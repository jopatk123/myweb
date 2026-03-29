import fs from 'fs/promises';
import path from 'path';
import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempLogDir = path.join(__dirname, '../tmp-logger');
const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  Object.keys(process.env).forEach(key => {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  });
  Object.assign(process.env, ORIGINAL_ENV);
}

async function loadLoggerModule() {
  jest.resetModules();
  return import('../../src/utils/logger.js');
}

afterEach(async () => {
  restoreEnv();
  jest.resetModules();
  await fs.rm(tempLogDir, { recursive: true, force: true });
});

describe('utils/logger branches', () => {
  test('initializes logger in development fallback mode', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.LOG_LEVEL;
    process.env.LOG_TO_FILE = '0';
    process.env.VERBOSE_LOGGING = '0';

    const { Logger } = await loadLoggerModule();
    const logger = new Logger({ module: 'DevLogger' });

    logger.debug('dev debug');
    logger.info('dev info');
    logger.warn('dev warn');
    logger.error('dev error');

    expect(typeof logger.child).toBe('function');
  });

  test('initializes logger with explicit LOG_LEVEL', async () => {
    process.env.NODE_ENV = 'development';
    process.env.LOG_LEVEL = 'warn';
    process.env.LOG_TO_FILE = '0';

    const { Logger } = await loadLoggerModule();
    const logger = new Logger({ module: 'LevelLogger' });

    logger.info('info with explicit level');
    expect(logger).toBeDefined();
  });

  test('initializes logger with verbose logging branch', async () => {
    process.env.NODE_ENV = 'development';
    process.env.VERBOSE_LOGGING = '1';
    process.env.LOG_TO_FILE = '0';

    const { Logger } = await loadLoggerModule();
    const logger = new Logger({ module: 'VerboseLogger' });

    logger.debug('verbose debug');
    expect(logger).toBeDefined();
  });

  test('initializes logger with production branch and file destination', async () => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_TO_FILE = '1';
    process.env.LOG_DIR = tempLogDir;

    const { Logger } = await loadLoggerModule();
    const logger = new Logger({ module: 'ProdLogger' });

    logger.info('prod info');
    const stat = await fs.stat(tempLogDir);
    expect(stat.isDirectory()).toBe(true);
  });

  test('covers logger method meta/no-meta branches', async () => {
    process.env.NODE_ENV = 'development';
    process.env.LOG_TO_FILE = '0';

    const { Logger } = await loadLoggerModule();
    const logger = new Logger({ module: 'MethodLogger' });

    logger.debug('debug with meta', { x: 1 });
    logger.debug('debug no meta');
    logger.info('info with meta', { x: 1 });
    logger.info('info no meta');
    logger.warn('warn with meta', { x: 1 });
    logger.warn('warn no meta');
    logger.error('error with Error', new Error('boom'));
    logger.error('error with meta', { x: 1 });
    logger.error('error no meta');

    expect(logger).toBeDefined();
  });

  test('covers constructor name fallback and default module name', async () => {
    process.env.NODE_ENV = 'development';
    process.env.LOG_TO_FILE = '0';

    const { Logger, createLogger } = await loadLoggerModule();

    const byName = new Logger({ name: 'NameLogger' });
    const byDefault = new Logger();
    const createdDefault = createLogger();

    byName.info('name logger');
    byDefault.info('default logger');
    createdDefault.info('created default logger');

    expect(byName).toBeDefined();
    expect(byDefault).toBeDefined();
    expect(createdDefault).toBeDefined();
  });
});

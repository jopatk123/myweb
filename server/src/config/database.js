import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import knex from 'knex';
import {
  initWallpaperTables,
  initAppTables,
  initFileTables,
  initNotebookTables,
  initMessageTables,
  initWorkTimerTables,
} from '../db/schema.js';
import { ensureWallpaperColumns, ensureAppsColumns } from '../db/migration.js';
import { ensureBuiltinApps, seedAppsIfEmpty } from '../db/seeding.js';
import logger from '../utils/logger.js';
import { resolveDatabasePath, applyDatabasePathOverride } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbLogger = logger.child('Database');

/**
 * 数据库双抽象说明：
 * - 运行时使用 better-sqlite3（同步 API），性能高且与单进程模型契合。
 * - 迁移阶段使用 knex（异步 API）仅用于 migrate.latest()，迁移文件内部
 *   仍通过 better-sqlite3 直接执行 DDL，因为 SQLite 的 DDL 不支持事务回滚，
 *   且 better-sqlite3 的同步语义让迁移逻辑更可预测。
 * - 两者共享同一个数据库文件，knex 实例用完即 destroy，不参与运行时。
 */
async function runMigrations(resolvedPath) {
  const knexConfig = {
    client: 'better-sqlite3',
    connection: { filename: resolvedPath },
    migrations: {
      directory: path.join(__dirname, '../migrations'),
    },
    useNullAsDefault: true,
  };

  const migrator = knex(knexConfig);
  try {
    await migrator.migrate.latest();
  } finally {
    await migrator.destroy();
  }
}

export async function initDatabase(options = {}) {
  const {
    dbPath: overridePath,
    seedBuiltinApps = true,
    silent = false,
  } = options;

  const resolvedPath = resolveDatabasePath(overridePath);

  applyDatabasePathOverride(overridePath);

  // 确保数据目录存在
  const dataDir = path.dirname(resolvedPath);
  if (resolvedPath !== ':memory:') {
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  const useInMemory = resolvedPath === ':memory:';

  if (!useInMemory) {
    await runMigrations(resolvedPath);
  }

  const db = new Database(resolvedPath);

  // 启用外键约束
  db.pragma('foreign_keys = ON');

  // 设置WAL模式以提高并发性能
  db.pragma('journal_mode = WAL');

  if (useInMemory) {
    initWallpaperTables(db);
    initAppTables(db);
    initFileTables(db);
    initNotebookTables(db);
    initWorkTimerTables(db);
    try {
      initMessageTables(db);
    } catch (e) {
      dbLogger.warn('无法初始化 message board 表（非致命）', {
        error: e,
      });
    }
  }

  // 迁移: 确保缺失列存在
  ensureWallpaperColumns(db);
  // 迁移: 确保 apps 表包含必要列（is_builtin, target_url）
  try {
    ensureAppsColumns(db);
  } catch (e) {
    dbLogger.warn('apps 表列迁移失败（非致命）', {
      error: e,
    });
  }
  // 迁移: 初始化应用管理相关表与缺失列
  // ensureAppTablesAndColumns 的列检查逻辑直接放在 migration.js 的后续版本
  // 确保内置应用存在（用于恢复误删或旧库缺失）
  if (seedBuiltinApps) {
    ensureBuiltinApps(db);
    // 数据种子：仅当 apps 表为空时插入示例应用（兼容旧逻辑）
    seedAppsIfEmpty(db);
  }

  if (!silent) {
    dbLogger.info('Database initialized', {
      path: resolvedPath,
      inMemory: useInMemory,
    });
  }

  return db;
}

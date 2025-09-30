import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import knex from 'knex';
import {
  initWallpaperTables,
  initAppTables,
  initFileTables,
  initNovelTables,
  initNovelBookmarkTables,
  initNotebookTables,
  initMessageTables,
  initSnakeMultiplayerTables,
  initWorkTimerTables,
  initMusicTables,
} from '../db/schema.js';
import {
  ensureWallpaperColumns,
  ensureAppsColumns,
  ensureNovelRelations,
  ensureFilesTypeCategoryIncludesNovel,
  ensureSnakeMultiplayerColumns,
} from '../db/migration.js';
import { ensureBuiltinApps, seedAppsIfEmpty } from '../db/seeding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  const resolvedPath =
    overridePath ||
    process.env.DB_PATH ||
    path.join(__dirname, '../../data/myweb.db');

  if (overridePath) {
    process.env.DB_PATH = overridePath;
  }

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
    initNovelTables(db);
    initMusicTables(db);
    try {
      initNovelBookmarkTables(db);
    } catch (e) {
      console.warn('无法初始化 novel_bookmarks 表（非致命）:', e.message || e);
    }
    initNotebookTables(db);
    initWorkTimerTables(db);
    try {
      initMessageTables(db);
    } catch (e) {
      console.warn('无法初始化 message board 表（非致命）:', e.message || e);
    }
    try {
      initSnakeMultiplayerTables(db);
    } catch (e) {
      console.warn(
        '无法初始化 snake multiplayer 表（非致命）:',
        e.message || e
      );
    }
  }

  // 迁移: 确保缺失列存在
  ensureWallpaperColumns(db);
  // 迁移: 确保 apps 表包含必要列（is_builtin, target_url）
  try {
    ensureAppsColumns(db);
  } catch (e) {
    console.warn('apps 表列迁移失败（非致命）:', e.message || e);
  }
  // 迁移: 初始化应用管理相关表与缺失列
  // ensureAppTablesAndColumns 的列检查逻辑直接放在 migration.js 的后续版本
  // 迁移: 初始化文件管理相关表（已由 schema 负责）
  // 确保 files.type_category 包含 'novel'（若旧库未包含）
  try {
    ensureFilesTypeCategoryIncludesNovel(db);
  } catch (e) {
    console.warn('文件类型分类迁移检查失败（非致命）:', e.message || e);
  }
  try {
    ensureNovelRelations(db);
  } catch (e) {
    console.warn('小说相关表迁移失败（非致命）:', e.message || e);
  }
  // 迁移: 确保贪吃蛇多人游戏表包含必要列
  try {
    ensureSnakeMultiplayerColumns(db);
  } catch (e) {
    console.warn('snake multiplayer 列迁移检查失败（非致命）:', e.message || e);
  }
  try {
    initMusicTables(db);
  } catch (e) {
    console.warn('无法初始化 music_tracks 表（非致命）:', e.message || e);
  }
  // 确保内置应用存在（用于恢复误删或旧库缺失）
  if (seedBuiltinApps) {
    ensureBuiltinApps(db);
    // 数据种子：仅当 apps 表为空时插入示例应用（兼容旧逻辑）
    seedAppsIfEmpty(db);
  }

  if (!silent) {
    console.log(`📊 Database initialized: ${resolvedPath}`);
  }

  return db;
}

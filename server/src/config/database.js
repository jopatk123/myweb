import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import {
  initWallpaperTables,
  initAppTables,
  initFileTables,
  initNovelTables,
  initNotebookTables,
  initNovelBookmarkTables,
  initMessageTables,
  initSnakeMultiplayerTables,
} from '../db/schema.js';
import { ensureWallpaperColumns, ensureAppsColumns } from '../db/migration.js';
import { ensureFilesTypeCategoryIncludesNovel } from '../db/migration.js';
import { ensureBuiltinApps, seedAppsIfEmpty } from '../db/seeding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase() {
  const dbPath =
    process.env.DB_PATH || path.join(__dirname, '../../data/myweb.db');

  // 确保数据目录存在
  const dataDir = path.dirname(dbPath);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }

  const db = new Database(dbPath);

  // 启用外键约束
  db.pragma('foreign_keys = ON');

  // 设置WAL模式以提高并发性能
  db.pragma('journal_mode = WAL');

  // 创建表
  initWallpaperTables(db);
  initAppTables(db);
  initFileTables(db);
  // 新增 novels 表初始化
  initNovelTables(db);
  // 新增 novel_bookmarks 表初始化
  try {
    initNovelBookmarkTables(db);
  } catch (e) {
    console.warn('无法初始化 novel_bookmarks 表（非致命）:', e.message || e);
  }
  // 新增 notebook 表初始化
  initNotebookTables(db);
  // 新增 work-timer 表初始化
  try {
    const { initWorkTimerTables } = await import('../db/schema.js');
    initWorkTimerTables(db);
  } catch (e) {
    console.warn('无法初始化 work-timer 表（非致命）:', e.message || e);
  }

  // 新增 message board 表初始化
  try {
    initMessageTables(db);
  } catch (e) {
    console.warn('无法初始化 message board 表（非致命）:', e.message || e);
  }

  // 新增 snake multiplayer 表初始化
  try {
    initSnakeMultiplayerTables(db);
  } catch (e) {
    console.warn('无法初始化 snake multiplayer 表（非致命）:', e.message || e);
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
  // 确保内置应用存在（用于恢复误删或旧库缺失）
  ensureBuiltinApps(db);
  // 数据种子：仅当 apps 表为空时插入示例应用（兼容旧逻辑）
  seedAppsIfEmpty(db);

  console.log(`📊 Database initialized: ${dbPath}`);

  return db;
}

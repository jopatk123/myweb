/**
 * @fileoverview
 * This file contains functions for creating database tables.
 */

/**
 * Initializes wallpaper-related tables: `wallpaper_groups` and `wallpapers`.
 * Also inserts a default wallpaper group.
 * @param {import('better-sqlite3').Database} db - The database instance.
 */
export function initWallpaperTables(db) {
  // 创建壁纸分组表
  const groupTableSql = `
    CREATE TABLE IF NOT EXISTS wallpaper_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      is_default BOOLEAN DEFAULT 0,
      is_current BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_wallpaper_groups_name ON wallpaper_groups(name);
    CREATE INDEX IF NOT EXISTS idx_wallpaper_groups_deleted_at ON wallpaper_groups(deleted_at);
  `;

  // 创建壁纸表
  const wallpaperTableSql = `
    CREATE TABLE IF NOT EXISTS wallpapers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mime_type TEXT,
      group_id INTEGER REFERENCES wallpaper_groups(id) ON DELETE SET NULL,
      name TEXT,
      is_active INTEGER DEFAULT 0,
      deleted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_wallpapers_group_id ON wallpapers(group_id);
    CREATE INDEX IF NOT EXISTS idx_wallpapers_is_active ON wallpapers(is_active);
    CREATE INDEX IF NOT EXISTS idx_wallpapers_deleted_at ON wallpapers(deleted_at);
  `;

  // 执行表创建
  db.exec(groupTableSql);
  db.exec(wallpaperTableSql);

  // 插入默认分组
  const insertDefaultGroup = db.prepare(`
    INSERT OR IGNORE INTO wallpaper_groups (name, is_default)
    VALUES (?, ?)
  `);
  insertDefaultGroup.run('默认', 1);

  console.log('📊 Wallpaper tables initialized');
}

/**
 * Initializes app-related tables: `app_groups` and `apps`.
 * Also inserts a default app group.
 * @param {import('better-sqlite3').Database} db - The database instance.
 */
export function initAppTables(db) {
  // 创建应用分组与应用表（若不存在）
  const appGroupTableSql = `
    CREATE TABLE IF NOT EXISTS app_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      slug VARCHAR(100) UNIQUE,
      is_default BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_app_groups_name ON app_groups(name);
    CREATE INDEX IF NOT EXISTS idx_app_groups_deleted_at ON app_groups(deleted_at);
  `;

  const appsTableSql = `
    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      icon_filename TEXT,
      group_id INTEGER REFERENCES app_groups(id) ON DELETE SET NULL,
      is_visible INTEGER DEFAULT 1,
      is_autostart INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      -- 新增列：用于标识内置应用与外部链接（确保新建数据库包含这些列）
      is_builtin INTEGER DEFAULT 0,
      target_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_apps_group_id ON apps(group_id);
    CREATE INDEX IF NOT EXISTS idx_apps_is_visible ON apps(is_visible);
    CREATE INDEX IF NOT EXISTS idx_apps_is_autostart ON apps(is_autostart);
    CREATE INDEX IF NOT EXISTS idx_apps_is_deleted ON apps(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
  `;

  db.exec(appGroupTableSql);
  db.exec(appsTableSql);

  // 插入默认应用分组
  const insertDefaultAppGroup = db.prepare(`
    INSERT OR IGNORE INTO app_groups (name, slug, is_default)
    VALUES (?, ?, ?)
  `);
  insertDefaultAppGroup.run('默认', 'default', 1);

  console.log('📊 App tables initialized');
}

/**
 * Initializes file-related tables: `files`.
 * @param {import('better-sqlite3').Database} db - The database instance.
 */
export function initFileTables(db) {
  const filesTableSql = `
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      type_category TEXT NOT NULL CHECK(type_category IN ('image', 'video', 'word', 'excel', 'archive', 'other', 'novel')),
      file_url TEXT,
      uploader_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON files(uploader_id);
    CREATE INDEX IF NOT EXISTS idx_files_type_category ON files(type_category);
    CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
  `;

  db.exec(filesTableSql);
  console.log('📁 File management tables initialized');
}

/**
 * Initializes novels table
 * @param {import('better-sqlite3').Database} db
 */
export function initNovelTables(db) {
  const novelsTableSql = `
    CREATE TABLE IF NOT EXISTS novels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      author TEXT,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_url TEXT,
      uploader_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_novels_created_at ON novels(created_at);
    CREATE INDEX IF NOT EXISTS idx_novels_uploader_id ON novels(uploader_id);
  `;

  db.exec(novelsTableSql);
  console.log('📚 Novels table initialized');
}

/**
 * Initializes notebook notes table
 * @param {import('better-sqlite3').Database} db
 */
export function initNotebookTables(db) {
  const notesTableSql = `
    CREATE TABLE IF NOT EXISTS notebook_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      priority TEXT DEFAULT 'medium',
      completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_notebook_notes_completed ON notebook_notes(completed);
    CREATE INDEX IF NOT EXISTS idx_notebook_notes_category ON notebook_notes(category);
    CREATE INDEX IF NOT EXISTS idx_notebook_notes_created_at ON notebook_notes(created_at);
  `;

  db.exec(notesTableSql);
  console.log('📝 Notebook notes table initialized');
}

/**
 * Initializes work timer related tables: `work_sessions` and `work_stats`.
 * Single-user assumptions: no user_id field.
 */
export function initWorkTimerTables(db) {
  const workSessionsSql = `
    CREATE TABLE IF NOT EXISTS work_sessions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      last_update DATETIME,
      end_time DATETIME,
      duration INTEGER DEFAULT 0,
      target_end_time TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_work_sessions_date ON work_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_work_sessions_is_active ON work_sessions(is_active);
  `;

  const workStatsSql = `
    CREATE TABLE IF NOT EXISTS work_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_ms INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ensure there is at least one row to simplify upserts
  `;

  const workDailyTotalsSql = `
    CREATE TABLE IF NOT EXISTS work_daily_totals (
      date TEXT PRIMARY KEY,
      total_ms INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_work_daily_totals_date ON work_daily_totals(date);
  `;

  db.exec(workSessionsSql);
  db.exec(workStatsSql);
  db.exec(workDailyTotalsSql);

  // Ensure a single stats row exists
  const insertStats = db.prepare(
    `INSERT OR IGNORE INTO work_stats (id, total_ms) VALUES (1, 0)`
  );
  try {
    insertStats.run();
  } catch (e) {
    console.warn('初始化 work_stats 失败（非致命）:', e.message || e);
  }

  console.log('⏱️ Work timer tables initialized');
}

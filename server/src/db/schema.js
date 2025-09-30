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
      file_id INTEGER UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_novels_file_path ON novels(file_path);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_novels_file_id ON novels(file_id) WHERE file_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_novels_created_at ON novels(created_at);
    CREATE INDEX IF NOT EXISTS idx_novels_uploader_id ON novels(uploader_id);
  `;

  db.exec(novelsTableSql);
  console.log('📚 Novels table initialized');
}

/**
 * Initializes novel bookmarks table `novel_bookmarks`
 * @param {import('better-sqlite3').Database} db
 */
export function initNovelBookmarkTables(db) {
  const novelBookmarksSql = `
    CREATE TABLE IF NOT EXISTS novel_bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id TEXT NOT NULL,
      novel_id INTEGER,
      file_id INTEGER,
      title TEXT NOT NULL,
      chapter_index INTEGER NOT NULL DEFAULT 0,
      scroll_position INTEGER DEFAULT 0,
      note TEXT,
      device_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_book_id ON novel_bookmarks(book_id);
    CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_file_id ON novel_bookmarks(file_id);
    CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_novel_id ON novel_bookmarks(novel_id);
    CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_device_id ON novel_bookmarks(device_id);
    CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_created_at ON novel_bookmarks(created_at);
  `;

  db.exec(novelBookmarksSql);
  console.log('📖 Novel bookmarks table initialized');
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

/**
 * Initializes message board related tables: `messages` and `user_sessions`.
 * @param {import('better-sqlite3').Database} db - The database instance.
 */
export function initMessageTables(db) {
  // 创建留言表
  const messagesTableSql = `
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      author_name VARCHAR(100) DEFAULT 'Anonymous',
      author_color VARCHAR(7) DEFAULT '#007bff',
      session_id VARCHAR(36) NOT NULL,
      images TEXT,
      image_type VARCHAR(20),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
  `;

  // 创建用户会话表
  const userSessionsTableSql = `
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id VARCHAR(36) UNIQUE NOT NULL,
      nickname VARCHAR(100) DEFAULT 'Anonymous',
      avatar_color VARCHAR(7) DEFAULT '#007bff',
      auto_open_enabled BOOLEAN DEFAULT 1,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active);
  `;

  db.exec(messagesTableSql);
  db.exec(userSessionsTableSql);

  console.log('💬 Message board tables initialized');
}

/**
 * 初始化贪吃蛇多人游戏相关表
 * @param {import('better-sqlite3').Database} db - The database instance.
 */
export function initSnakeMultiplayerTables(db) {
  // 贪吃蛇房间表
  const snakeRoomsTableSql = `
    CREATE TABLE IF NOT EXISTS snake_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code VARCHAR(10) UNIQUE NOT NULL,
      mode VARCHAR(20) NOT NULL DEFAULT 'shared',
      game_type VARCHAR(20) NOT NULL DEFAULT 'snake',
      max_players INTEGER DEFAULT 8,
      current_players INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'waiting',
      created_by VARCHAR(36) NOT NULL,
      game_settings TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_snake_rooms_room_code ON snake_rooms(room_code);
    CREATE INDEX IF NOT EXISTS idx_snake_rooms_status ON snake_rooms(status);
    CREATE INDEX IF NOT EXISTS idx_snake_rooms_created_by ON snake_rooms(created_by);
  `;

  // 贪吃蛇玩家表
  const snakePlayersTableSql = `
    CREATE TABLE IF NOT EXISTS snake_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      session_id VARCHAR(36) NOT NULL,
      player_name VARCHAR(50) NOT NULL,
      player_color VARCHAR(7) DEFAULT '#007bff',
      is_ready BOOLEAN DEFAULT 0,
      is_online BOOLEAN DEFAULT 1,
      score INTEGER DEFAULT 0,
      snake_length INTEGER DEFAULT 3,
      last_vote VARCHAR(10),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES snake_rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snake_players_room_session ON snake_players(room_id, session_id);
    CREATE INDEX IF NOT EXISTS idx_snake_players_is_online ON snake_players(is_online);
  `;

  // 贪吃蛇游戏记录表
  const snakeGameRecordsTableSql = `
    CREATE TABLE IF NOT EXISTS snake_game_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      mode VARCHAR(20) NOT NULL,
      winner_session_id VARCHAR(36),
      winner_score INTEGER DEFAULT 0,
      game_duration INTEGER DEFAULT 0,
      end_reason VARCHAR(50) DEFAULT 'finished',
      player_count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES snake_rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snake_game_records_room_id ON snake_game_records(room_id);
    CREATE INDEX IF NOT EXISTS idx_snake_game_records_winner ON snake_game_records(winner_session_id);
    CREATE INDEX IF NOT EXISTS idx_snake_game_records_mode ON snake_game_records(mode);
  `;

  // 执行表创建
  db.exec(snakeRoomsTableSql);
  db.exec(snakePlayersTableSql);
  db.exec(snakeGameRecordsTableSql);

  console.log('🐍 Snake multiplayer tables initialized');
}

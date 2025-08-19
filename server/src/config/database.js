import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/myweb.db');
  
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
  initTables(db);
  // 迁移: 确保缺失列存在
  ensureWallpaperColumns(db);
  
  console.log(`📊 Database initialized: ${dbPath}`);
  
  return db;
}

function initTables(db) {
  // 创建壁纸分组表
  const groupTableSql = `
    CREATE TABLE IF NOT EXISTS wallpaper_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      is_default BOOLEAN DEFAULT 0,
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
      description TEXT,
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
    INSERT OR IGNORE INTO wallpaper_groups (name, description, is_default) 
    VALUES (?, ?, ?)
  `);
  insertDefaultGroup.run('默认', '系统默认壁纸分组', 1);
  
  console.log('📊 Database tables initialized');
}

function ensureWallpaperColumns(db) {
  const existingColumns = db.prepare('PRAGMA table_info(wallpapers)').all();
  const existingColumnNames = new Set(existingColumns.map(col => col.name));

  const maybeAddColumn = (name, type) => {
    if (!existingColumnNames.has(name)) {
      db.prepare(`ALTER TABLE wallpapers ADD COLUMN ${name} ${type}`).run();
      console.log(`🛠️ Added column to wallpapers: ${name} ${type}`);
    }
  };

  // 与模型一致: filename, original_name, file_path, file_size
  maybeAddColumn('filename', 'TEXT');
  maybeAddColumn('original_name', 'TEXT');
  maybeAddColumn('file_path', 'TEXT');
  maybeAddColumn('file_size', 'INTEGER');
  // 也需要: name, description（旧库可能缺失）
  maybeAddColumn('name', 'TEXT');
  maybeAddColumn('description', 'TEXT');
}
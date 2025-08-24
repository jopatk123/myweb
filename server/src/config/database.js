import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

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
  initTables(db);
  // 迁移: 确保缺失列存在
  ensureWallpaperColumns(db);
  // 迁移: 初始化应用管理相关表与缺失列
  ensureAppTablesAndColumns(db);
  // 迁移: 初始化文件管理相关表
  ensureFileTables(db);
  // 确保内置应用存在（用于恢复误删或旧库缺失）
  ensureBuiltinApps(db);
  // 数据种子：仅当 apps 表为空时插入示例应用（兼容旧逻辑）
  seedAppsIfEmpty(db);

  console.log(`📊 Database initialized: ${dbPath}`);

  return db;
}

function initTables(db) {
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
  // 也需要: name（旧库可能缺失）。description 字段已移除
  maybeAddColumn('name', 'TEXT');

  // 如果旧库还存在 wallpapers.description 列，则迁移并删除该列（已在之前添加）
  if (existingColumnNames.has('description')) {
    try {
      console.log(
        '🛠️ Detected deprecated `description` column on wallpapers, starting migration to remove it'
      );

      // 创建新表（不包含 description）
      db.exec(`
        CREATE TABLE IF NOT EXISTS wallpapers_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mime_type TEXT,
          group_id INTEGER REFERENCES wallpaper_groups(id) ON DELETE SET NULL,
          name TEXT,
          is_active INTEGER DEFAULT 0,
          deleted_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          filename TEXT,
          original_name TEXT,
          file_path TEXT,
          file_size INTEGER
        );
      `);

      // 将存在的数据（除 description 外）复制到新表
      db.exec(`
        INSERT INTO wallpapers_new (id, mime_type, group_id, name, is_active, deleted_at, created_at, updated_at, filename, original_name, file_path, file_size)
        SELECT id, mime_type, group_id, name, is_active, deleted_at, created_at, updated_at, filename, original_name, file_path, file_size FROM wallpapers;
      `);

      // 删除旧表并重命名
      db.exec('DROP TABLE wallpapers;');
      db.exec('ALTER TABLE wallpapers_new RENAME TO wallpapers;');

      // 重新创建索引
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallpapers_group_id ON wallpapers(group_id);'
      );
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallpapers_is_active ON wallpapers(is_active);'
      );
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallpapers_deleted_at ON wallpapers(deleted_at);'
      );

      console.log(
        '✅ Migration complete: `description` column removed from wallpapers'
      );
    } catch (err) {
      console.error(
        '❌ Failed to migrate wallpapers table to remove description column:',
        err
      );
      throw err;
    }
  }

  // 如果旧库中 wallpaper_groups 表包含 description 列，则迁移并删除该列
  const groupColumns = db.prepare('PRAGMA table_info(wallpaper_groups)').all();
  const groupColumnNames = new Set(groupColumns.map(col => col.name));
  // 如果缺少 is_current 列，直接添加
  if (!groupColumnNames.has('is_current')) {
    db.prepare(
      'ALTER TABLE wallpaper_groups ADD COLUMN is_current BOOLEAN DEFAULT 0'
    ).run();
    console.log(
      '🛠️ Added column to wallpaper_groups: is_current BOOLEAN DEFAULT 0'
    );
    // 若新增了该列，且当前没有任何分组标记为当前，则把默认分组设为当前
    try {
      const cnt = db
        .prepare(
          'SELECT COUNT(1) AS c FROM wallpaper_groups WHERE is_current = 1 AND deleted_at IS NULL'
        )
        .get().c;
      if (cnt === 0) {
        db.prepare(
          'UPDATE wallpaper_groups SET is_current = 1 WHERE is_default = 1 AND deleted_at IS NULL'
        ).run();
        console.log(
          '✅ Set default group as current after adding is_current column'
        );
      }
    } catch (e) {
      console.warn('Could not set default group as current:', e);
    }
  }
  if (groupColumnNames.has('description')) {
    try {
      console.log(
        '🛠️ Detected deprecated `description` column on wallpaper_groups, starting migration to remove it'
      );
      db.exec(`
        CREATE TABLE IF NOT EXISTS wallpaper_groups_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(100) NOT NULL UNIQUE,
          is_default BOOLEAN DEFAULT 0,
          is_current BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME DEFAULT NULL
        );
      `);

      db.exec(`
        INSERT INTO wallpaper_groups_new (id, name, is_default, is_current, created_at, updated_at, deleted_at)
        SELECT id, name, is_default, 0 as is_current, created_at, updated_at, deleted_at FROM wallpaper_groups;
      `);

      db.exec('DROP TABLE wallpaper_groups;');
      db.exec('ALTER TABLE wallpaper_groups_new RENAME TO wallpaper_groups;');

      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallpaper_groups_name ON wallpaper_groups(name);'
      );
      db.exec(
        'CREATE INDEX IF NOT EXISTS idx_wallpaper_groups_deleted_at ON wallpaper_groups(deleted_at);'
      );

      console.log(
        '✅ Migration complete: `description` column removed from wallpaper_groups'
      );
    } catch (err) {
      console.error(
        '❌ Failed to migrate wallpaper_groups table to remove description column:',
        err
      );
      throw err;
    }
  }
}

// 应用管理：初始化表并确保列存在
function ensureAppTablesAndColumns(db) {
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
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_apps_group_id ON apps(group_id);
    CREATE INDEX IF NOT EXISTS idx_apps_is_visible ON apps(is_visible);
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

  // 确保必要列存在（为老库升级）
  const ensureColumn = (table, name, type) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    const names = new Set(cols.map(c => c.name));
    if (!names.has(name)) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`).run();
      console.log(`🛠️ Added column to ${table}: ${name} ${type}`);
    }
  };

  // apps 兼容性检查
  try {
    ensureColumn('apps', 'description', 'TEXT');
    ensureColumn('apps', 'icon_filename', 'TEXT');
    // 新增：是否内置应用 与 自定义跳转URL
    ensureColumn('apps', 'is_builtin', 'INTEGER DEFAULT 0');
    ensureColumn('apps', 'target_url', 'TEXT');
    ensureColumn(
      'apps',
      'group_id',
      'INTEGER REFERENCES app_groups(id) ON DELETE SET NULL'
    );
    ensureColumn('apps', 'is_visible', 'INTEGER DEFAULT 1');
    ensureColumn('apps', 'is_deleted', 'INTEGER DEFAULT 0');
  } catch (e) {
    console.warn('ensureAppTablesAndColumns warning:', e?.message || e);
  }
}

function seedAppsIfEmpty(db) {
  try {
    const row = db
      .prepare('SELECT COUNT(1) AS c FROM apps WHERE is_deleted = 0')
      .get();
    if (row && row.c === 0) {
      // 确保默认分组存在
      const g = db
        .prepare(
          "SELECT id FROM app_groups WHERE slug = 'default' AND deleted_at IS NULL"
        )
        .get();
      const gid = g ? g.id : null;
      const insert = db.prepare(
        `INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_builtin, target_url) VALUES (?,?,?,?,?,?,?,?)`
      );
      insert.run(
        '贪吃蛇',
        'snake',
        '经典小游戏（本地实现示例）',
        'snake-128.png',
        gid,
        1,
        1,
        null
      );
      console.log('🌱 Seeded example app: snake');

      // 也种子计算器应用，避免额外脚本依赖（如果尚未存在）
      const hasCalculator = db
        .prepare('SELECT id FROM apps WHERE slug = ? AND is_deleted = 0')
        .get('calculator');
      if (!hasCalculator) {
        try {
          insert.run(
            '计算器',
            'calculator',
            '科学计算器，支持基本运算和内存功能',
            'calculator-128.png',
            gid,
            1,
            1,
            null
          );
          console.log('🌱 Seeded example app: calculator');
        } catch (e) {
          console.warn(
            'seedAppsIfEmpty: failed to seed calculator app:',
            e?.message || e
          );
        }
      } else {
        console.log(
          '🟢 Calculator app already exists, skipping seed for calculator'
        );
      }

      // 也种子笔记本应用
      const hasNotebook = db
        .prepare('SELECT id FROM apps WHERE slug = ? AND is_deleted = 0')
        .get('notebook');
      if (!hasNotebook) {
        try {
          insert.run(
            '笔记本',
            'notebook',
            '待办事项管理，记录和跟踪日常任务',
            'notebook-128.svg',
            gid,
            1,
            1,
            null
          );
          console.log('🌱 Seeded example app: notebook');
        } catch (e) {
          console.warn(
            'seedAppsIfEmpty: failed to seed notebook app:',
            e?.message || e
          );
        }
      } else {
        console.log(
          '🟢 Notebook app already exists, skipping seed for notebook'
        );
      }
    }
  } catch (e) {
    console.warn('seedAppsIfEmpty warning:', e?.message || e);
  }
}

// 确保内置应用（snake, calculator, notebook）存在并且为 is_builtin
function ensureBuiltinApps(db) {
  try {
    const builtins = [
      {
        name: '贪吃蛇',
        slug: 'snake',
        description: '经典小游戏（本地实现示例）',
        icon_filename: 'snake-128.png',
        is_visible: 1,
        is_builtin: 1,
        target_url: null,
      },
      {
        name: '计算器',
        slug: 'calculator',
        description: '科学计算器，支持基本运算和内存功能',
        icon_filename: 'calculator-128.png',
        is_visible: 1,
        is_builtin: 1,
        target_url: null,
      },
      {
        name: '笔记本',
        slug: 'notebook',
        description: '待办事项管理，记录和跟踪日常任务',
        icon_filename: 'notebook-128.svg',
        is_visible: 1,
        is_builtin: 1,
        target_url: null,
      },
      {
        name: '下班计时器',
        slug: 'work-timer',
        description: '工作时间管理和下班倒计时',
        icon_filename: 'work-timer-128.svg',
        is_visible: 1,
        is_builtin: 1,
        target_url: null,
      },
    ];

    const findStmt = db.prepare(
      'SELECT id, is_deleted FROM apps WHERE slug = ?'
    );
    const insertStmt = db.prepare(
      `INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_builtin, target_url, is_deleted) VALUES (?,?,?,?,?,?,?,?,?)`
    );
    const updateStmt = db.prepare(
      `UPDATE apps SET name = ?, description = ?, icon_filename = ?, is_visible = ?, is_builtin = ?, target_url = ?, is_deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE slug = ?`
    );

    // ensure default group id exists
    const g = db
      .prepare(
        "SELECT id FROM app_groups WHERE slug = 'default' AND deleted_at IS NULL"
      )
      .get();
    const gid = g ? g.id : null;

    for (const b of builtins) {
      const row = findStmt.get(b.slug);
      if (!row) {
        insertStmt.run(
          b.name,
          b.slug,
          b.description,
          b.icon_filename,
          gid,
          b.is_visible,
          b.is_builtin,
          b.target_url,
          0
        );
        console.log(`🌱 Inserted builtin app: ${b.slug}`);
      } else if (row.is_deleted === 1) {
        updateStmt.run(
          b.name,
          b.description,
          b.icon_filename,
          b.is_visible,
          b.is_builtin,
          b.target_url,
          b.slug
        );
        console.log(`♻️ Restored builtin app: ${b.slug}`);
      } else {
        // ensure it is marked as builtin and visible
        db.prepare(
          'UPDATE apps SET is_builtin = ?, is_visible = ?, icon_filename = ?, description = ?, target_url = ? WHERE slug = ?'
        ).run(
          b.is_builtin,
          b.is_visible,
          b.icon_filename,
          b.description,
          b.target_url,
          b.slug
        );
      }
    }
  } catch (e) {
    console.warn('ensureBuiltinApps warning:', e?.message || e);
  }
}

// 文件管理：初始化文件表
function ensureFileTables(db) {
  const filesTableSql = `
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      type_category TEXT NOT NULL CHECK(type_category IN ('image', 'video', 'word', 'excel', 'archive', 'other')),
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

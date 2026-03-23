import Database from 'better-sqlite3';
import * as migration from '../../../src/db/migration.js';
import { ensureWallpaperColumns } from '../../../src/db/migrations/wallpapers.js';
import { ensureFilesTypeCategoryIncludesNovel } from '../../../src/db/migrations/files.js';
import { ensureAppsColumns } from '../../../src/db/migrations/apps.js';

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exitCode = 1;
    throw new Error(message);
  }
}

assert(migration.ensureWallpaperColumns === ensureWallpaperColumns, 'ensureWallpaperColumns re-export mismatch');
assert(
  migration.ensureFilesTypeCategoryIncludesNovel === ensureFilesTypeCategoryIncludesNovel,
  'ensureFilesTypeCategoryIncludesNovel re-export mismatch'
);
assert(migration.ensureAppsColumns === ensureAppsColumns, 'ensureAppsColumns re-export mismatch');

const db = new Database(':memory:');
db.pragma('foreign_keys = OFF');

db.exec(`
  CREATE TABLE wallpaper_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
  );

  CREATE TABLE wallpapers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mime_type TEXT,
    group_id INTEGER,
    name TEXT,
    is_active INTEGER DEFAULT 0,
    description TEXT,
    deleted_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

ensureWallpaperColumns(db);

const wallpaperColumns = new Set(
  db.prepare('PRAGMA table_info(wallpapers)').all().map(col => col.name)
);
const wallpaperGroupsColumns = new Set(
  db.prepare('PRAGMA table_info(wallpaper_groups)').all().map(col => col.name)
);

assert(!wallpaperColumns.has('description'), 'description column should be removed');
['filename', 'original_name', 'file_path', 'file_size', 'name'].forEach(col =>
  assert(wallpaperColumns.has(col), `wallpapers column ${col} should exist`)
);
assert(wallpaperGroupsColumns.has('is_current'), 'wallpaper_groups should have is_current');

db.exec(`
  CREATE TABLE apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT
  );
`);

ensureAppsColumns(db);

const appColumnNames = new Set(
  db.prepare('PRAGMA table_info(apps)').all().map(col => col.name)
);
['is_builtin', 'target_url', 'is_autostart'].forEach(col =>
  assert(appColumnNames.has(col), `apps column ${col} should exist`)
);

db.exec(`
  CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    type_category TEXT NOT NULL CHECK(type_category IN ('image','video','word','excel','archive','other')),
    file_url TEXT,
    uploader_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

ensureFilesTypeCategoryIncludesNovel(db);

const filesTableSql = db
  .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='files'")
  .get().sql;

assert(/'novel'/.test(filesTableSql), 'files table should include novel in CHECK constraint');
assert(/'music'/.test(filesTableSql), 'files table should include music in CHECK constraint');

db.close();

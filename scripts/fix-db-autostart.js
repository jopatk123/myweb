// fix-db-autostart.js
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'server/data/myweb.db');
if (!fs.existsSync(dbPath)) {
  console.error('Database not found at', dbPath);
  process.exit(1);
}
const db = new Database(dbPath);
const cols = db
  .prepare('PRAGMA table_info(apps)')
  .all()
  .map(c => c.name);
if (!cols.includes('is_autostart')) {
  db.prepare(
    'ALTER TABLE apps ADD COLUMN is_autostart INTEGER DEFAULT 0'
  ).run();
  try {
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_apps_is_autostart ON apps(is_autostart)'
    );
  } catch (_error) {
    void _error;
    // 忽略索引创建错误
  }
  console.log('✅ Added column is_autostart and index');
} else {
  console.log('✅ Column is_autostart already exists');
}

import Database from 'better-sqlite3';
import { ensureWallpaperColumns } from '../db/migration.js';

export const up = async knex => {
  const filename = knex.client.config.connection.filename;
  const db = new Database(filename);

  try {
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');
    ensureWallpaperColumns(db);
  } finally {
    db.close();
  }
};

export const down = async () => {
  // 不回滚：仅新增内部优化表并做状态归一化
};

export const config = {
  transaction: false,
};

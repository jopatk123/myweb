import Database from 'better-sqlite3';
import {
  initWallpaperTables,
  initAppTables,
  initFileTables,
  initNotebookTables,
  initMessageTables,
  initWorkTimerTables,
} from '../db/schema.js';
import { ensureWallpaperColumns, ensureAppsColumns } from '../db/migration.js';

export const up = async knex => {
  const filename = knex.client.config.connection.filename;
  const db = new Database(filename);

  try {
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');

    initWallpaperTables(db);
    initAppTables(db);
    initFileTables(db);
    initNotebookTables(db);
    initWorkTimerTables(db);
    initMessageTables(db);

    ensureWallpaperColumns(db);
    ensureAppsColumns(db);
  } finally {
    db.close();
  }
};

export const down = async () => {
  // 不执行回滚：核心表结构不应被删除
};

export const config = {
  transaction: false,
};

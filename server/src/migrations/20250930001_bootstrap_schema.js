import Database from 'better-sqlite3';
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
} from '../db/schema.js';
import {
  ensureWallpaperColumns,
  ensureAppsColumns,
  ensureFilesTypeCategoryIncludesNovel,
  ensureNovelRelations,
  ensureSnakeMultiplayerColumns,
} from '../db/migration.js';

export const up = async knex => {
  const filename = knex.client.config.connection.filename;
  const db = new Database(filename);

  try {
    db.pragma('foreign_keys = ON');

    initWallpaperTables(db);
    initAppTables(db);
    initFileTables(db);
    initNovelTables(db);
    initNovelBookmarkTables(db);
    initNotebookTables(db);
    initWorkTimerTables(db);
    initMessageTables(db);
    initSnakeMultiplayerTables(db);

    ensureWallpaperColumns(db);
    ensureAppsColumns(db);
    ensureFilesTypeCategoryIncludesNovel(db);
    ensureNovelRelations(db);
    ensureSnakeMultiplayerColumns(db);
  } finally {
    db.close();
  }
};

export const down = async () => {
  // 不执行回滚：核心表结构不应被删除
};

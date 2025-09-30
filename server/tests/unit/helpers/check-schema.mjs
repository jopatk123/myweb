import Database from 'better-sqlite3';
import * as schema from '../../../src/db/schema.js';
import { initWallpaperTables } from '../../../src/db/schema/wallpapers.js';
import { initAppTables } from '../../../src/db/schema/apps.js';
import { initFileTables } from '../../../src/db/schema/files.js';
import { initNovelTables } from '../../../src/db/schema/novels.js';
import { initNovelBookmarkTables } from '../../../src/db/schema/novelBookmarks.js';
import { initNotebookTables } from '../../../src/db/schema/notebook.js';
import { initWorkTimerTables } from '../../../src/db/schema/workTimer.js';
import { initMessageTables } from '../../../src/db/schema/messageBoard.js';
import { initSnakeMultiplayerTables } from '../../../src/db/schema/snakeMultiplayer.js';
import { initMusicTables } from '../../../src/db/schema/music.js';

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exitCode = 1;
    throw new Error(message);
  }
}

assert(schema.initWallpaperTables === initWallpaperTables, 'initWallpaperTables re-export mismatch');
assert(schema.initAppTables === initAppTables, 'initAppTables re-export mismatch');
assert(schema.initFileTables === initFileTables, 'initFileTables re-export mismatch');
assert(schema.initNovelTables === initNovelTables, 'initNovelTables re-export mismatch');
assert(
  schema.initNovelBookmarkTables === initNovelBookmarkTables,
  'initNovelBookmarkTables re-export mismatch'
);
assert(schema.initNotebookTables === initNotebookTables, 'initNotebookTables re-export mismatch');
assert(schema.initWorkTimerTables === initWorkTimerTables, 'initWorkTimerTables re-export mismatch');
assert(schema.initMessageTables === initMessageTables, 'initMessageTables re-export mismatch');
assert(
  schema.initSnakeMultiplayerTables === initSnakeMultiplayerTables,
  'initSnakeMultiplayerTables re-export mismatch'
);
assert(schema.initMusicTables === initMusicTables, 'initMusicTables re-export mismatch');

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');

const initializers = [
  schema.initFileTables,
  schema.initWallpaperTables,
  schema.initAppTables,
  schema.initNovelTables,
  schema.initNovelBookmarkTables,
  schema.initNotebookTables,
  schema.initWorkTimerTables,
  schema.initMessageTables,
  schema.initSnakeMultiplayerTables,
  schema.initMusicTables,
];

for (const init of initializers) {
  init(db);
}

const filesTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='files'")
  .get();

assert(Boolean(filesTable), 'files table should exist after initialization');

db.close();

import Database from 'better-sqlite3';
import * as schema from '../../../src/db/schema.js';
import { initWallpaperTables } from '../../../src/db/schema/wallpapers.js';
import { initAppTables } from '../../../src/db/schema/apps.js';
import { initFileTables } from '../../../src/db/schema/files.js';
import { initNotebookTables } from '../../../src/db/schema/notebook.js';
import { initWorkTimerTables } from '../../../src/db/schema/workTimer.js';
import { initMessageTables } from '../../../src/db/schema/messageBoard.js';

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
assert(schema.initNotebookTables === initNotebookTables, 'initNotebookTables re-export mismatch');
assert(schema.initWorkTimerTables === initWorkTimerTables, 'initWorkTimerTables re-export mismatch');
assert(schema.initMessageTables === initMessageTables, 'initMessageTables re-export mismatch');

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');

const initializers = [
  schema.initFileTables,
  schema.initWallpaperTables,
  schema.initAppTables,
  schema.initNotebookTables,
  schema.initWorkTimerTables,
  schema.initMessageTables,
];

for (const init of initializers) {
  init(db);
}

const filesTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='files'")
  .get();

assert(Boolean(filesTable), 'files table should exist after initialization');

db.close();

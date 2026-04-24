// 本项目基于 better-sqlite3，同一进程内无需复杂的连接池管理
// 这里只保留全局 db 实例读写能力。

import logger from './logger.js';

let dbInstance = null;
const poolLogger = logger.child('DbPool');

export function setDb(db) {
  dbInstance = db;
}

export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call setDb() first.');
  }
  return dbInstance;
}

export function wrapTransaction(db, operation) {
  if (!db || typeof db.transaction !== 'function') {
    throw new TypeError(
      'A valid better-sqlite3 database instance is required.'
    );
  }

  if (typeof operation !== 'function') {
    throw new TypeError('A transaction callback function is required.');
  }

  const transaction = db.transaction((...args) => operation(...args));
  return (...args) => transaction(...args);
}

export function runSafe(db, operation) {
  if (typeof operation !== 'function') {
    throw new TypeError('A database operation callback function is required.');
  }

  try {
    return operation(db);
  } catch (error) {
    poolLogger.error('Database operation failed', error);
    throw error;
  }
}

export default { setDb, getDb, wrapTransaction, runSafe };

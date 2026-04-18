// 本项目基于 better-sqlite3，同一进程内无需复杂的连接池管理
// 这里只保留全局 db 实例读写能力。

let dbInstance = null;

export function setDb(db) {
  dbInstance = db;
}

export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call setDb() first.');
  }
  return dbInstance;
}

export default { setDb, getDb };

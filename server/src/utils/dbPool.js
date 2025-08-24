// 本项目基于 better-sqlite3，同一进程内无需复杂的连接池管理
// 但提供一些小工具以便未来扩展或集中管理 DB 实例

export function wrapTransaction(db, fn) {
  const txn = db.transaction(fn);
  return (...args) => txn(...args);
}

export function runSafe(db, fn) {
  try {
    return fn(db);
  } catch (e) {
    console.error('dbPool.runSafe error:', e);
    throw e;
  }
}

export default { wrapTransaction, runSafe };

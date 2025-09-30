import { initDatabase } from '../../src/config/database.js';

export async function createTestDatabase(options = {}) {
  const merged = {
    dbPath: ':memory:',
    seedBuiltinApps: false,
    silent: true,
    ...options,
  };

  process.env.DB_PATH = merged.dbPath;
  const db = await initDatabase(merged);
  return db;
}

export function closeTestDatabase(db) {
  if (!db) return;
  try {
    db.close();
  } catch (error) {
    void error;
  }
}

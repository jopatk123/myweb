import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/myweb.db');
  
  // 确保数据目录存在
  const dataDir = path.dirname(dbPath);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }

  const db = new Database(dbPath);
  
  // 启用外键约束
  db.pragma('foreign_keys = ON');
  
  // 设置WAL模式以提高并发性能
  db.pragma('journal_mode = WAL');
  
  console.log(`📊 Database initialized: ${dbPath}`);
  
  return db;
}
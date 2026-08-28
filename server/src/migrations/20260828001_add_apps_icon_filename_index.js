/**
 * Migration: add apps.icon_filename index
 *
 * 删除应用时会执行 countByIconFilename（SELECT COUNT(1) ... WHERE icon_filename = ?），
 * 无索引时为全表扫描。schema 双源中的 db/schema/apps.js 已同步添加，
 * 本迁移负责为已存在的生产库补建索引。
 */
import Database from 'better-sqlite3';

export const up = async knex => {
  const filename = knex.client.config.connection.filename;
  const db = new Database(filename);

  try {
    db.pragma('busy_timeout = 5000');
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_apps_icon_filename ON apps(icon_filename)'
    );
  } finally {
    db.close();
  }
};

export const down = async () => {
  // 不回滚：索引无害，down 几乎不会手动执行
};

export const config = {
  transaction: false,
};

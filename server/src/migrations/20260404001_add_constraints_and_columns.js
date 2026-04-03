/**
 * Migration: add constraints and columns
 *
 * 1. files        — 新增 deleted_at 软删字段
 * 2. notebook_notes — 修复 priority 字段 CHECK 约束
 *    （SQLite 不支持 ALTER TABLE ADD CONSTRAINT，需重建表）
 * 3. apps         — 同步历史 is_deleted=1 数据到 deleted_at，保持一致
 */
import Database from 'better-sqlite3';

export const up = async knex => {
  const filename = knex.client.config.connection.filename;
  const db = new Database(filename);

  try {
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = OFF'); // 重建表期间关闭外键，避免级联问题

    db.transaction(() => {
      // ── 1. files: 新增 deleted_at 列 ───────────────────────────────
      const hasDeletedAt = db
        .prepare(
          `SELECT COUNT(1) AS c FROM pragma_table_info('files') WHERE name = 'deleted_at'`
        )
        .get();
      if (!hasDeletedAt || hasDeletedAt.c === 0) {
        db.prepare(
          `ALTER TABLE files ADD COLUMN deleted_at DATETIME DEFAULT NULL`
        ).run();
        db.prepare(
          `CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files(deleted_at)`
        ).run();
      }

      // ── 2. notebook_notes: 重建表以添加 CHECK 约束 ─────────────────
      const hasPriorityCheck = db
        .prepare(
          `SELECT sql FROM sqlite_master WHERE type='table' AND name='notebook_notes'`
        )
        .get();
      const needsRebuild =
        !hasPriorityCheck?.sql?.includes('CHECK(priority IN');

      if (needsRebuild) {
        db.prepare(
          `ALTER TABLE notebook_notes RENAME TO _notebook_notes_old`
        ).run();

        db.prepare(
          `
          CREATE TABLE notebook_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT,
            priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
            completed INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
        ).run();

        // 将旧数据迁入，不合法的 priority 值归一为 'medium'
        db.prepare(
          `
          INSERT INTO notebook_notes (id, title, description, category, priority, completed, created_at, updated_at)
          SELECT
            id, title, description, category,
            CASE WHEN priority IN ('low', 'medium', 'high') THEN priority ELSE 'medium' END,
            completed, created_at, updated_at
          FROM _notebook_notes_old
        `
        ).run();

        db.prepare(`DROP TABLE _notebook_notes_old`).run();

        // 重建索引
        db.prepare(
          `CREATE INDEX IF NOT EXISTS idx_notebook_notes_completed ON notebook_notes(completed)`
        ).run();
        db.prepare(
          `CREATE INDEX IF NOT EXISTS idx_notebook_notes_category ON notebook_notes(category)`
        ).run();
        db.prepare(
          `CREATE INDEX IF NOT EXISTS idx_notebook_notes_created_at ON notebook_notes(created_at)`
        ).run();
      }

      // ── 3. apps: 同步 is_deleted=1 → deleted_at ────────────────────
      const hasIsDeleted = db
        .prepare(
          `SELECT COUNT(1) AS c FROM pragma_table_info('apps') WHERE name = 'is_deleted'`
        )
        .get();
      if (hasIsDeleted && hasIsDeleted.c > 0) {
        db.prepare(
          `
          UPDATE apps
          SET deleted_at = CURRENT_TIMESTAMP
          WHERE is_deleted = 1 AND deleted_at IS NULL
        `
        ).run();
      }
    })();
  } finally {
    db.pragma('foreign_keys = ON');
    db.close();
  }
};

export const down = async () => {
  // 不回滚：列和约束变更较小，且 down 几乎不会手动执行
};

export const config = {
  transaction: false,
};

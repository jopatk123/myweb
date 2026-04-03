/**
 * Seeding helpers: insert builtin apps and seed example apps when empty.
 */

import { BUILTIN_APP_DEFINITIONS } from '../../../shared/builtin-apps.js';
import logger from '../utils/logger.js';

const seedLogger = logger.child('Seeding');

export const BUILTIN_APPS = BUILTIN_APP_DEFINITIONS.map(app => ({
  name: app.name,
  slug: app.slug,
  description: app.description,
  icon_filename: app.iconFilename,
  is_visible: app.visible ? 1 : 0,
  is_builtin: 1,
  target_url: null,
}));

function removeObsoleteBuiltinApps(db) {
  const builtinSlugs = BUILTIN_APPS.map(app => app.slug);
  const placeholders = builtinSlugs.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT id, slug FROM apps WHERE is_builtin = 1 AND is_deleted = 0 AND slug NOT IN (${placeholders})`
    )
    .all(...builtinSlugs);

  if (!rows.length) {
    return;
  }

  const deleteStmt = db.prepare(
    'UPDATE apps SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );

  for (const row of rows) {
    deleteStmt.run(row.id);
    seedLogger.info(`Removed obsolete builtin app: ${row.slug}`);
  }
}

export function seedAppsIfEmpty(db) {
  try {
    const row = db
      .prepare('SELECT COUNT(1) AS c FROM apps WHERE is_deleted = 0')
      .get();
    if (row && row.c === 0) {
      // 确保默认分组存在
      const g = db
        .prepare(
          "SELECT id FROM app_groups WHERE slug = 'default' AND deleted_at IS NULL"
        )
        .get();
      const gid = g ? g.id : null;
      const insert = db.prepare(
        `INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_builtin, target_url) VALUES (?,?,?,?,?,?,?,?)`
      );
      insert.run(
        '计算器',
        'calculator',
        '科学计算器，支持基本运算和内存功能',
        'calculator-128.png',
        gid,
        1,
        1,
        null
      );
      seedLogger.info('Seeded example app: calculator');

      const hasNotebook = db
        .prepare('SELECT id FROM apps WHERE slug = ? AND is_deleted = 0')
        .get('notebook');
      if (!hasNotebook) {
        try {
          insert.run(
            '笔记本',
            'notebook',
            '待办事项管理，记录和跟踪日常任务',
            'notebook-128.svg',
            gid,
            1,
            1,
            null
          );
          seedLogger.info('Seeded example app: notebook');
        } catch (e) {
          // ignore duplicate
        }
      }
    }
  } catch (e) {
    seedLogger.warn('seedAppsIfEmpty warning', { error: e?.message || e });
  }
}

export function ensureBuiltinApps(db) {
  try {
    const builtins = BUILTIN_APPS;

    const findStmt = db.prepare(
      'SELECT id, is_deleted, is_builtin, description, icon_filename, target_url, is_visible FROM apps WHERE slug = ?'
    );
    const insertStmt = db.prepare(
      `INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_builtin, target_url, is_deleted) VALUES (?,?,?,?,?,?,?,?,?)`
    );
    const restoreStmt = db.prepare(
      `UPDATE apps SET is_deleted = 0, is_builtin = 1, updated_at = CURRENT_TIMESTAMP WHERE slug = ?`
    );

    // ensure default group id exists
    const g = db
      .prepare(
        "SELECT id FROM app_groups WHERE slug = 'default' AND deleted_at IS NULL"
      )
      .get();
    const gid = g ? g.id : null;

    removeObsoleteBuiltinApps(db);

    for (const b of builtins) {
      const row = findStmt.get(b.slug);
      if (!row) {
        insertStmt.run(
          b.name,
          b.slug,
          b.description,
          b.icon_filename,
          gid,
          b.is_visible,
          b.is_builtin,
          b.target_url,
          0
        );
        seedLogger.info(`Inserted builtin app: ${b.slug}`);
        continue;
      }

      if (row.is_deleted === 1) {
        restoreStmt.run(b.slug);
        seedLogger.info(`Restored builtin app: ${b.slug}`);
      }

      const patch = [];
      const params = [];

      if (!row.is_builtin) {
        patch.push('is_builtin = 1');
      }

      if (!row.icon_filename && b.icon_filename) {
        patch.push('icon_filename = ?');
        params.push(b.icon_filename);
      }

      if (!row.description && b.description) {
        patch.push('description = ?');
        params.push(b.description);
      }

      if (row.target_url === null && b.target_url !== null) {
        patch.push('target_url = ?');
        params.push(b.target_url);
      }

      if (patch.length > 0) {
        patch.push('updated_at = CURRENT_TIMESTAMP');
        const sql = `UPDATE apps SET ${patch.join(', ')} WHERE slug = ?`;
        db.prepare(sql).run(...params, b.slug);
      }
    }
  } catch (e) {
    seedLogger.warn('ensureBuiltinApps warning', { error: e?.message || e });
  }
}

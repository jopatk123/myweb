/**
 * Seeding helpers: insert and repair builtin apps.
 * 单一真相源：shared/builtin-apps.js 的 BUILTIN_APP_DEFINITIONS。
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
      `SELECT id, slug FROM apps WHERE is_builtin = 1 AND deleted_at IS NULL AND slug NOT IN (${placeholders})`
    )
    .all(...builtinSlugs);

  if (!rows.length) {
    return;
  }

  const deleteStmt = db.prepare(
    'UPDATE apps SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  );

  for (const row of rows) {
    deleteStmt.run(row.id);
    seedLogger.info(`Removed obsolete builtin app: ${row.slug}`);
  }
}

export function ensureBuiltinApps(db) {
  try {
    const builtins = BUILTIN_APPS;

    const findStmt = db.prepare(
      'SELECT id, deleted_at, is_builtin, description, icon_filename, target_url, is_visible FROM apps WHERE slug = ?'
    );
    const insertStmt = db.prepare(
      `INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_builtin, target_url) VALUES (?,?,?,?,?,?,?,?)`
    );
    const restoreStmt = db.prepare(
      `UPDATE apps SET deleted_at = NULL, is_builtin = 1, updated_at = CURRENT_TIMESTAMP WHERE slug = ?`
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
          b.target_url
        );
        seedLogger.info(`Inserted builtin app: ${b.slug}`);
        continue;
      }

      if (row.deleted_at !== null && row.deleted_at !== undefined) {
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

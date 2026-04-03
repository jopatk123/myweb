/**
 * 应用分组模型（单分组）
 */
import logger from '../utils/logger.js';

const groupLogger = logger.child('AppGroupModel');

export class AppGroupModel {
  constructor(db) {
    this.db = db;
  }

  findAll() {
    const sql = `SELECT * FROM app_groups WHERE deleted_at IS NULL ORDER BY created_at DESC`;
    return this.db.prepare(sql).all();
  }

  findById(id) {
    const sql = `SELECT * FROM app_groups WHERE id = ? AND deleted_at IS NULL`;
    return this.db.prepare(sql).get(id);
  }

  /**
   * 按 slug 查找分组（包含软删除的记录）
   * @param {string} slug
   * @param {number|null} excludeId - 排除指定 id（用于更新时避免自身充突）
   */
  findBySlug(slug, excludeId = null) {
    if (excludeId) {
      return this.db
        .prepare(
          'SELECT id, deleted_at FROM app_groups WHERE slug = ? AND id != ?'
        )
        .get(slug, excludeId);
    }
    return this.db
      .prepare('SELECT id, deleted_at FROM app_groups WHERE slug = ?')
      .get(slug);
  }

  create({ name, slug, is_default = 0 }) {
    // 如果提供了 slug，先检查是否存在（包含已被软删除的记录）
    if (slug) {
      const existing = this.db
        .prepare('SELECT id, deleted_at FROM app_groups WHERE slug = ?')
        .get(slug);
      if (existing) {
        // 若存在且已被软删除，则恢复该分组并更新字段
        if (existing.deleted_at) {
          const upd = this.db.prepare(
            'UPDATE app_groups SET name = ?, is_default = ?, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          );
          upd.run(name, is_default ? 1 : 0, existing.id);
          return this.findById(existing.id);
        }
        // 存在且未删除，直接返回现有记录
        return this.findById(existing.id);
      }
    }

    const sql = `INSERT INTO app_groups (name, slug, is_default) VALUES (?, ?, ?)`;
    const info = this.db.prepare(sql).run(name, slug, is_default ? 1 : 0);
    return this.findById(info.lastInsertRowid);
  }

  update(id, { name, slug, is_default }) {
    const fields = [];
    const params = [];

    if (name !== undefined) {
      fields.push('name = ?');
      params.push(name);
    }
    if (slug !== undefined) {
      fields.push('slug = ?');
      params.push(slug);
    }
    if (is_default !== undefined) {
      fields.push('is_default = ?');
      params.push(is_default ? 1 : 0);
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE app_groups SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.db.prepare(sql).run(...params, id);
    return this.findById(id);
  }

  softDelete(id) {
    // 删除分组前：
    // 1) 不允许删除默认分组（is_default = 1）
    // 2) 确保存在默认分组（若不存在则创建），并把要删除分组下的应用移动到默认分组
    const row = this.db
      .prepare('SELECT id, is_default FROM app_groups WHERE id = ?')
      .get(id);
    if (!row) return false;
    if (row.is_default) {
      const err = new Error('默认分组不可删除');
      err.status = 400;
      throw err;
    }

    // 查找默认分组 id
    let def = this.db
      .prepare('SELECT id FROM app_groups WHERE is_default = 1')
      .get();
    let defaultId = def ? def.id : null;
    if (!defaultId) {
      // 若缺失默认分组，则创建一个
      const insert = this.db
        .prepare(
          'INSERT INTO app_groups (name, slug, is_default) VALUES (?,?,?)'
        )
        .run('默认', 'default', 1);
      defaultId = insert.lastInsertRowid;
      groupLogger.info('[softDelete] created default group', { defaultId });
    }

    // 将属于该分组的应用移动到默认分组
    try {
      const upd = this.db.prepare(
        'UPDATE apps SET group_id = ? WHERE group_id = ?'
      );
      const infoUpd = upd.run(defaultId, id);
      groupLogger.info('[softDelete] moved apps to default group', {
        count: infoUpd.changes,
        fromGroup: id,
        toDefault: defaultId,
      });
    } catch (e) {
      groupLogger.warn('[softDelete] failed to move apps', {
        error: e?.message || String(e),
      });
    }

    // 标记软删除
    const sql = `
      UPDATE app_groups
      SET deleted_at = CURRENT_TIMESTAMP,
          is_default = CASE WHEN is_default = 1 THEN 0 ELSE is_default END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const info = this.db.prepare(sql).run(id);
    groupLogger.info('[softDelete] soft-deleted group', {
      id,
      changes: info.changes,
    });
    return info.changes === undefined ? true : info.changes;
  }
}

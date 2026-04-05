/**
 * 应用模型
 */
import logger from '../utils/logger.js';
import { BaseModel } from './base.model.js';

const appModelLogger = logger.child('AppModel');

export class AppModel extends BaseModel {
  constructor(db) {
    super(db);
  }

  /**
   * 支持分页：返回 { items, total, page, limit }
   * 若未传 page/limit，则返回数组（向后兼容）
   */
  findAll({ groupId = null, visible = null, page = null, limit = null } = {}) {
    const whereClauses = ['deleted_at IS NULL'];
    const params = [];
    if (groupId) {
      whereClauses.push('group_id = ?');
      params.push(groupId);
    }
    if (visible !== null && visible !== undefined) {
      whereClauses.push('is_visible = ?');
      params.push(visible ? 1 : 0);
    }
    const where = whereClauses.length
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const pageNum = Number(page);
    const limitNum = Number(limit);
    if (Number.isFinite(pageNum) && Number.isFinite(limitNum) && limitNum > 0) {
      return this.paginate(
        'apps',
        where,
        params,
        'created_at DESC',
        limitNum,
        pageNum
      );
    }

    return this.db
      .prepare(`SELECT * FROM apps ${where} ORDER BY created_at DESC`)
      .all(...params);
  }

  findById(id) {
    const sql = `SELECT * FROM apps WHERE id = ? AND deleted_at IS NULL`;
    return this.db.prepare(sql).get(id);
  }

  findBySlug(slug) {
    const sql = `SELECT * FROM apps WHERE slug = ? AND deleted_at IS NULL`;
    return this.db.prepare(sql).get(slug);
  }

  create({
    name,
    slug,
    description = null,
    icon_filename = null,
    group_id = null,
    is_visible = 1,
    is_autostart = 0,
    is_builtin = 0,
    target_url = null,
  }) {
    const sql = `INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_autostart, is_builtin, target_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const info = this.db
      .prepare(sql)
      .run(
        name,
        slug,
        description,
        icon_filename,
        group_id,
        is_visible ? 1 : 0,
        is_autostart ? 1 : 0,
        is_builtin ? 1 : 0,
        target_url
      );
    return this.findById(info.lastInsertRowid);
  }

  update(id, payload) {
    // controller 调用前已通过 mapToSnake 转换，此处仅接受 snake_case 字段
    const fieldMap = {
      name: 'name',
      slug: 'slug',
      description: 'description',
      icon_filename: 'icon_filename',
      group_id: 'group_id',
      is_visible: 'is_visible',
      is_builtin: 'is_builtin',
      target_url: 'target_url',
      is_autostart: 'is_autostart',
    };

    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(payload)) {
      const col = fieldMap[key];
      if (!col) continue;
      if (col === 'is_visible' || col === 'is_autostart') {
        params.push(value ? 1 : 0);
      } else {
        params.push(value);
      }
      fields.push(`${col} = ?`);
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE apps SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.db.prepare(sql).run(...params, id);
    return this.findById(id);
  }

  setVisible(id, visible) {
    const sql = `UPDATE apps SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.db.prepare(sql).run(visible ? 1 : 0, id);
    return this.findById(id);
  }

  setAutostart(id, autostart) {
    const sql = `UPDATE apps SET is_autostart = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.db.prepare(sql).run(autostart ? 1 : 0, id);
    return this.findById(id);
  }

  setAutostartBySlug(slug, autostart) {
    const sql = `UPDATE apps SET is_autostart = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ? AND deleted_at IS NULL`;
    this.db.prepare(sql).run(autostart ? 1 : 0, slug);
    return this.findBySlug(slug);
  }

  softDelete(id) {
    const sql = `UPDATE apps SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.db.prepare(sql).run(id);
    return true;
  }

  hardDelete(id) {
    const sql = `DELETE FROM apps WHERE id = ?`;
    this.db.prepare(sql).run(id);
    return true;
  }

  /**
   * 统计指定图标文件在未删除的应用中的引用数量
   */
  countByIconFilename(iconFilename) {
    const sql = `SELECT COUNT(1) AS cnt FROM apps WHERE deleted_at IS NULL AND icon_filename = ?`;
    const row = this.db.prepare(sql).get(iconFilename);
    return row ? Number(row.cnt) : 0;
  }

  moveToGroup(ids, targetGroupId) {
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE apps SET group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;
    const info = this.db.prepare(sql).run(targetGroupId, ...ids);
    appModelLogger.debug('moveToGroup', {
      params: [targetGroupId, ...ids],
      changes: info.changes,
    });
    return info.changes === undefined ? true : info.changes;
  }
}

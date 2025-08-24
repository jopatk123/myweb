/**
 * 应用模型
 */
export class AppModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * 支持分页：返回 { items, total }
   * 若未传 page/limit，则返回数组
   */
  findAll({ groupId = null, visible = null, page = null, limit = null } = {}) {
    const whereClauses = ['is_deleted = 0'];
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

    if (page && limit) {
      const totalRow = this.db
        .prepare(`SELECT COUNT(1) AS total FROM apps ${where}`)
        .get(...params);
      const total = totalRow ? totalRow.total : 0;
      const offset = (Number(page) - 1) * Number(limit);
      const items = this.db
        .prepare(
          `SELECT * FROM apps ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .all(...params, Number(limit), offset);
      return { items, total };
    }

    return this.db
      .prepare(`SELECT * FROM apps ${where} ORDER BY created_at DESC`)
      .all(...params);
  }

  findById(id) {
    const sql = `SELECT * FROM apps WHERE id = ? AND is_deleted = 0`;
    return this.db.prepare(sql).get(id);
  }

  create({
    name,
    slug,
    description = null,
    icon_filename = null,
    group_id = null,
    is_visible = 1,
    is_builtin = 0,
    target_url = null,
  }) {
    const sql = `INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_builtin, target_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const info = this.db
      .prepare(sql)
      .run(
        name,
        slug,
        description,
        icon_filename,
        group_id,
        is_visible ? 1 : 0,
        is_builtin ? 1 : 0,
        target_url
      );
    return this.findById(info.lastInsertRowid);
  }

  update(id, payload) {
    // 允许前端使用 camelCase 或 snake_case，映射到数据库列名
    const fieldMap = {
      name: 'name',
      slug: 'slug',
      description: 'description',
      iconFilename: 'icon_filename',
      icon_filename: 'icon_filename',
      groupId: 'group_id',
      group_id: 'group_id',
      isVisible: 'is_visible',
      is_visible: 'is_visible',
      isBuiltin: 'is_builtin',
      is_builtin: 'is_builtin',
      targetUrl: 'target_url',
      target_url: 'target_url',
    };

    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(payload)) {
      const col = fieldMap[key];
      if (!col) continue;
      if (col === 'is_visible') {
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

  softDelete(id) {
    const sql = `UPDATE apps SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    this.db.prepare(sql).run(id);
    return true;
  }

  moveToGroup(ids, targetGroupId) {
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE apps SET group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;
    const info = this.db.prepare(sql).run(targetGroupId, ...ids);
    // Log for debugging: which ids were updated and how many rows affected
    try {
      console.log(
        '[AppModel.moveToGroup] sql=',
        sql,
        'params=',
        [targetGroupId, ...ids],
        'changes=',
        info.changes
      );
    } catch (e) {
      // ignore logging errors
    }
    return info.changes === undefined ? true : info.changes;
  }
}

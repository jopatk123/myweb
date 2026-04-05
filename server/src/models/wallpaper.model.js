/**
 * 壁纸模型
 */
import { BaseModel } from './base.model.js';

export class WallpaperModel extends BaseModel {
  constructor(db) {
    super(db);
  }

  /**
   * findAll 支持两种返回模式：
   * - 未传入 page/limit 时：保持向后兼容，返回所有匹配的数组
   * - 传入 page 和 limit 时：返回分页对象 { items: [], total: number, page, limit }
   */
  findAll({
    groupId = null,
    activeOnly = false,
    page = null,
    limit = null,
  } = {}) {
    const whereClauses = ['deleted_at IS NULL'];
    const params = [];

    if (groupId) {
      whereClauses.push('group_id = ?');
      params.push(groupId);
    }

    if (activeOnly) {
      whereClauses.push('is_active = 1');
    }

    const where = whereClauses.length
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    // 分页模式
    if (page && limit) {
      return this.paginate(
        'wallpapers',
        where,
        params,
        'created_at DESC',
        Number(limit),
        Number(page)
      );
    }

    // 向后兼容：返回所有记录数组
    const sql = `SELECT * FROM wallpapers ${where} ORDER BY created_at DESC`;
    return this.db.prepare(sql).all(...params);
  }

  findById(id) {
    return this.db
      .prepare('SELECT * FROM wallpapers WHERE id = ? AND deleted_at IS NULL')
      .get(id);
  }

  findManyByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(', ');
    const sql = `SELECT * FROM wallpapers WHERE id IN (${placeholders}) AND deleted_at IS NULL`;
    return this.db.prepare(sql).all(...ids);
  }

  create(data) {
    // service 层调用前已通过 mapToSnake 转换，此处仅接受 snake_case 字段
    const sql = `
      INSERT INTO wallpapers (filename, original_name, file_path, file_size, mime_type, group_id, name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const result = this.db
      .prepare(sql)
      .run(
        data.filename,
        data.original_name,
        data.file_path,
        data.file_size,
        data.mime_type,
        data.group_id ?? null,
        data.name
      );
    return this.findById(result.lastInsertRowid);
  }

  update(id, data) {
    // 接受 snake_case 字段（wallpaper.service 层调用前已转换）
    const fieldMap = {
      filename: 'filename',
      original_name: 'original_name',
      file_path: 'file_path',
      file_size: 'file_size',
      mime_type: 'mime_type',
      group_id: 'group_id',
      name: 'name',
      is_active: 'is_active',
    };

    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(data)) {
      const col = fieldMap[key];
      if (!col) continue; // 忽略未知字段

      // 布尔值字段需转换为 0/1
      if (col === 'is_active') {
        params.push(value ? 1 : 0);
      } else {
        params.push(value);
      }
      fields.push(`${col} = ?`);
    }

    if (fields.length === 0) return this.findById(id);

    // 添加更新时间
    fields.push('updated_at = CURRENT_TIMESTAMP');

    const sql = `UPDATE wallpapers SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...params, id);

    return this.findById(id);
  }

  delete(id) {
    const sql =
      'UPDATE wallpapers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
    return this.db.prepare(sql).run(id);
  }

  deleteMany(ids) {
    if (!ids || ids.length === 0) return null;
    const placeholders = ids.map(() => '?').join(', ');
    const sql = `UPDATE wallpapers SET deleted_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;
    return this.db.prepare(sql).run(...ids);
  }

  moveMany(ids, groupId) {
    if (!ids || ids.length === 0) return null;
    const placeholders = ids.map(() => '?').join(', ');
    const sql = `UPDATE wallpapers SET group_id = ? WHERE id IN (${placeholders})`;
    return this.db.prepare(sql).run(groupId, ...ids);
  }

  setActive(id) {
    // 先取消所有活跃状态
    this.db
      .prepare('UPDATE wallpapers SET is_active = 0 WHERE deleted_at IS NULL')
      .run();
    // 设置指定壁纸为活跃
    return this.db
      .prepare('UPDATE wallpapers SET is_active = 1 WHERE id = ?')
      .run(id);
  }

  getActive() {
    return this.db
      .prepare(
        'SELECT * FROM wallpapers WHERE is_active = 1 AND deleted_at IS NULL'
      )
      .get();
  }

  getRandomByGroup(groupId) {
    if (groupId === null || groupId === undefined) {
      const sql = `
        SELECT * FROM wallpapers
        WHERE deleted_at IS NULL
        ORDER BY RANDOM()
        LIMIT 1
      `;
      return this.db.prepare(sql).get();
    }

    const sql = `
      SELECT * FROM wallpapers
      WHERE group_id = ? AND deleted_at IS NULL
      ORDER BY RANDOM()
      LIMIT 1
    `;
    return this.db.prepare(sql).get(groupId);
  }
}

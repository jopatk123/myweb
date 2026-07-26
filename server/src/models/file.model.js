import { BaseModel } from './base.model.js';

/**
 * files 表数据访问层
 *
 * 软删除策略：
 * - delete(id) 仅设置 deleted_at = CURRENT_TIMESTAMP，不物理删除
 * - findAll / findById 默认仅返回 deleted_at IS NULL 的记录
 * - 物理删除磁盘文件由 FileService.remove 异步清理
 */
export class FileModel extends BaseModel {
  constructor(db) {
    super(db);
  }

  /**
   * 分页查询文件列表
   * @param {object} opts
   * @param {number} [opts.page=1]
   * @param {number} [opts.limit=20]
   * @param {string|null} [opts.type] 类型分类
   * @param {string|null} [opts.search] 关键词（按文件名模糊匹配）
   * @param {boolean} [opts.includeDeleted=false] 是否包含已软删记录
   */
  findAll({
    page = 1,
    limit = 20,
    type = null,
    search = null,
    includeDeleted = false,
  } = {}) {
    const allowedTypes = new Set([
      'image',
      'video',
      'audio',
      'word',
      'excel',
      'ppt',
      'pdf',
      'text',
      'code',
      'archive',
      'other',
    ]);

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    const normalizedSearch = (search || '').trim();

    const whereClauses = [];
    const params = [];

    if (!includeDeleted) {
      whereClauses.push('deleted_at IS NULL');
    }
    if (type && allowedTypes.has(String(type).toLowerCase())) {
      whereClauses.push('type_category = ?');
      params.push(String(type).toLowerCase());
    }
    if (normalizedSearch) {
      whereClauses.push('(original_name LIKE ? OR stored_name LIKE ?)');
      params.push(`%${normalizedSearch}%`, `%${normalizedSearch}%`);
    }

    const where = whereClauses.length
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    return this.paginate(
      'files',
      where,
      params,
      'created_at DESC',
      safeLimit,
      safePage
    );
  }

  /**
   * 按 id 查询文件（默认排除已软删记录）
   */
  findById(id, { includeDeleted = false } = {}) {
    const sql = includeDeleted
      ? 'SELECT * FROM files WHERE id = ?'
      : 'SELECT * FROM files WHERE id = ? AND deleted_at IS NULL';
    return this.db.prepare(sql).get(id);
  }

  create(data) {
    const {
      originalName,
      storedName,
      filePath,
      mimeType,
      fileSize,
      typeCategory,
      fileUrl,
      uploaderId,
    } = data;

    const stmt = this.db.prepare(`
      INSERT INTO files (original_name, stored_name, file_path, mime_type, file_size, type_category, file_url, uploader_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      originalName,
      storedName,
      filePath,
      mimeType,
      fileSize,
      typeCategory,
      fileUrl || null,
      uploaderId || null
    );
    return this.findById(res.lastInsertRowid);
  }

  /**
   * 软删除：仅设置 deleted_at，保留记录以便审计与回滚
   */
  softDelete(id) {
    return this.db
      .prepare(
        'UPDATE files SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL'
      )
      .run(id);
  }

  /**
   * 物理删除数据库记录（仅用于磁盘清理后的最终清理）
   */
  hardDelete(id) {
    return this.db.prepare('DELETE FROM files WHERE id = ?').run(id);
  }

  /**
   * 兼容旧调用：执行软删除（而非物理 DELETE）
   * 旧调用方如 `model.delete(id)` 行为变为软删除
   */
  delete(id) {
    return this.softDelete(id);
  }
}

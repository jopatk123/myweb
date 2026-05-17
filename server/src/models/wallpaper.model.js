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

  getActiveId() {
    const runtimeRow = this.db
      .prepare(
        `
          SELECT s.active_wallpaper_id
          FROM wallpaper_runtime_state s
          JOIN wallpapers w ON w.id = s.active_wallpaper_id
          WHERE s.id = 1 AND w.deleted_at IS NULL
        `
      )
      .get();

    if (runtimeRow?.active_wallpaper_id) {
      return runtimeRow.active_wallpaper_id;
    }

    const legacyRow = this.db
      .prepare(
        `
          SELECT id
          FROM wallpapers
          WHERE is_active = 1 AND deleted_at IS NULL
          ORDER BY updated_at DESC, id DESC
          LIMIT 1
        `
      )
      .get();

    return legacyRow?.id ?? null;
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
    const previousActiveId = this.getActiveId();

    this.db.transaction(() => {
      if (previousActiveId && Number(previousActiveId) !== Number(id)) {
        this.db
          .prepare(
            `
              UPDATE wallpapers
              SET is_active = 0, updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND deleted_at IS NULL
            `
          )
          .run(previousActiveId);
      }

      this.db
        .prepare(
          `
            UPDATE wallpapers
            SET is_active = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND deleted_at IS NULL
          `
        )
        .run(id);

      this.db
        .prepare(
          `
            INSERT INTO wallpaper_runtime_state (id, active_wallpaper_id, updated_at)
            VALUES (1, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              active_wallpaper_id = excluded.active_wallpaper_id,
              updated_at = CURRENT_TIMESTAMP
          `
        )
        .run(id);
    })();

    return this.findById(id);
  }

  clearActiveIfMatches(id) {
    const currentActiveId = this.getActiveId();
    if (!currentActiveId || Number(currentActiveId) !== Number(id)) {
      return false;
    }

    this.db.transaction(() => {
      this.db
        .prepare(
          `
            UPDATE wallpapers
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `
        )
        .run(id);

      this.db
        .prepare(
          `
            INSERT INTO wallpaper_runtime_state (id, active_wallpaper_id, updated_at)
            VALUES (1, NULL, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              active_wallpaper_id = NULL,
              updated_at = CURRENT_TIMESTAMP
          `
        )
        .run();
    })();

    return true;
  }

  getActive() {
    const active = this.db
      .prepare(
        `
          SELECT w.*, 1 AS is_active
          FROM wallpapers w
          JOIN wallpaper_runtime_state s ON s.id = 1 AND s.active_wallpaper_id = w.id
          WHERE w.deleted_at IS NULL
        `
      )
      .get();

    if (active) {
      return active;
    }

    const legacyActive = this.db
      .prepare(
        `
          SELECT *
          FROM wallpapers
          WHERE is_active = 1 AND deleted_at IS NULL
          ORDER BY updated_at DESC, id DESC
          LIMIT 1
        `
      )
      .get();

    if (!legacyActive) {
      return undefined;
    }

    this.setActive(legacyActive.id);
    return this.findById(legacyActive.id);
  }

  getRandomByGroup(groupId) {
    const whereClauses = ['deleted_at IS NULL'];
    const params = [];

    if (groupId !== null && groupId !== undefined) {
      whereClauses.push('group_id = ?');
      params.push(groupId);
    }

    const where = `WHERE ${whereClauses.join(' AND ')}`;
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM wallpapers ${where}`)
      .get(...params);
    const total = Number(totalRow?.total || 0);

    if (total <= 0) {
      return undefined;
    }

    const offset = Math.floor(Math.random() * total);

    return this.db
      .prepare(
        `
          SELECT *
          FROM wallpapers
          ${where}
          ORDER BY id
          LIMIT 1 OFFSET ?
        `
      )
      .get(...params, offset);
  }

  trackThumbnailCache(wallpaperId, cachePath) {
    this.db
      .prepare(
        `
          INSERT INTO wallpaper_thumbnail_cache (wallpaper_id, cache_path, created_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(wallpaper_id, cache_path) DO NOTHING
        `
      )
      .run(wallpaperId, cachePath);
  }

  listThumbnailCachePaths(wallpaperId) {
    return this.db
      .prepare(
        `
          SELECT cache_path
          FROM wallpaper_thumbnail_cache
          WHERE wallpaper_id = ?
        `
      )
      .all(wallpaperId)
      .map(row => row.cache_path);
  }

  clearThumbnailCacheRecords(wallpaperId) {
    this.db
      .prepare('DELETE FROM wallpaper_thumbnail_cache WHERE wallpaper_id = ?')
      .run(wallpaperId);
  }
}

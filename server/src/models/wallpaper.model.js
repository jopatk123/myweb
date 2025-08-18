/**
 * 壁纸模型
 */
export class WallpaperModel {
  constructor(db) {
    this.db = db;
  }

  findAll(groupId = null, activeOnly = false) {
    let sql = 'SELECT * FROM wallpapers WHERE deleted_at IS NULL';
    const params = [];

    if (groupId) {
      sql += ' AND group_id = ?';
      params.push(groupId);
    }

    if (activeOnly) {
      sql += ' AND is_active = 1';
    }

    sql += ' ORDER BY created_at DESC';
    
    return this.db.prepare(sql).all(params);
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM wallpapers WHERE id = ? AND deleted_at IS NULL').get(id);
  }

  create(data) {
    const { filename, originalName, filePath, fileSize, mimeType, groupId } = data;
    const sql = `
      INSERT INTO wallpapers (filename, original_name, file_path, file_size, mime_type, group_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = this.db.prepare(sql).run(filename, originalName, filePath, fileSize, mimeType, groupId);
    return this.findById(result.lastInsertRowid);
  }

  update(id, data) {
    const fields = [];
    const params = [];

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    });

    if (fields.length === 0) return null;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `UPDATE wallpapers SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(params);
    
    return this.findById(id);
  }

  delete(id) {
    const sql = 'UPDATE wallpapers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
    return this.db.prepare(sql).run(id);
  }

  setActive(id) {
    // 先取消所有活跃状态
    this.db.prepare('UPDATE wallpapers SET is_active = 0').run();
    // 设置指定壁纸为活跃
    return this.db.prepare('UPDATE wallpapers SET is_active = 1 WHERE id = ?').run(id);
  }

  getActive() {
    return this.db.prepare('SELECT * FROM wallpapers WHERE is_active = 1 AND deleted_at IS NULL').get();
  }

  getRandomByGroup(groupId) {
    const sql = `
      SELECT * FROM wallpapers 
      WHERE group_id = ? AND deleted_at IS NULL 
      ORDER BY RANDOM() 
      LIMIT 1
    `;
    return this.db.prepare(sql).get(groupId);
  }
}
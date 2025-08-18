/**
 * 壁纸模型
 */
export class WallpaperModel {
  constructor(db) {
    this.db = db;
    this.initTable();
  }

  async initTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS wallpapers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        group_id INTEGER REFERENCES wallpaper_groups(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_wallpapers_group_id ON wallpapers(group_id);
      CREATE INDEX IF NOT EXISTS idx_wallpapers_is_active ON wallpapers(is_active);
      CREATE INDEX IF NOT EXISTS idx_wallpapers_deleted_at ON wallpapers(deleted_at);
    `;
    
    return this.db.exec(sql);
  }

  async findAll(groupId = null, activeOnly = false) {
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
    
    return this.db.all(sql, params);
  }

  async findById(id) {
    return this.db.get('SELECT * FROM wallpapers WHERE id = ? AND deleted_at IS NULL', [id]);
  }

  async create(data) {
    const { filename, originalName, filePath, fileSize, mimeType, groupId } = data;
    const sql = `
      INSERT INTO wallpapers (filename, original_name, file_path, file_size, mime_type, group_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await this.db.run(sql, [filename, originalName, filePath, fileSize, mimeType, groupId]);
    return this.findById(result.lastID);
  }

  async update(id, data) {
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
    await this.db.run(sql, params);
    
    return this.findById(id);
  }

  async delete(id) {
    const sql = 'UPDATE wallpapers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
    return this.db.run(sql, [id]);
  }

  async setActive(id) {
    // 先取消所有活跃状态
    await this.db.run('UPDATE wallpapers SET is_active = 0');
    // 设置指定壁纸为活跃
    return this.db.run('UPDATE wallpapers SET is_active = 1 WHERE id = ?', [id]);
  }

  async getActive() {
    return this.db.get('SELECT * FROM wallpapers WHERE is_active = 1 AND deleted_at IS NULL');
  }

  async getRandomByGroup(groupId) {
    const sql = `
      SELECT * FROM wallpapers 
      WHERE group_id = ? AND deleted_at IS NULL 
      ORDER BY RANDOM() 
      LIMIT 1
    `;
    return this.db.get(sql, [groupId]);
  }
}
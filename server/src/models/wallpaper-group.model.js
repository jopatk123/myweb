/**
 * 壁纸分组模型
 */
export class WallpaperGroupModel {
  constructor(db) {
    this.db = db;
    this.initTable();
  }

  async initTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS wallpaper_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_default BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_wallpaper_groups_name ON wallpaper_groups(name);
      CREATE INDEX IF NOT EXISTS idx_wallpaper_groups_deleted_at ON wallpaper_groups(deleted_at);

      -- 插入默认分组
      INSERT OR IGNORE INTO wallpaper_groups (name, description, is_default) 
      VALUES ('默认', '系统默认壁纸分组', 1);
    `;
    
    return this.db.exec(sql);
  }

  async findAll() {
    return this.db.all('SELECT * FROM wallpaper_groups WHERE deleted_at IS NULL ORDER BY is_default DESC, created_at ASC');
  }

  async findById(id) {
    return this.db.get('SELECT * FROM wallpaper_groups WHERE id = ? AND deleted_at IS NULL', [id]);
  }

  async create(data) {
    const { name, description } = data;
    const sql = 'INSERT INTO wallpaper_groups (name, description) VALUES (?, ?)';
    
    const result = await this.db.run(sql, [name, description]);
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

    const sql = `UPDATE wallpaper_groups SET ${fields.join(', ')} WHERE id = ?`;
    await this.db.run(sql, params);
    
    return this.findById(id);
  }

  async delete(id) {
    // 检查是否为默认分组
    const group = await this.findById(id);
    if (group?.is_default) {
      throw new Error('不能删除默认分组');
    }

    const sql = 'UPDATE wallpaper_groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
    return this.db.run(sql, [id]);
  }

  async getDefault() {
    return this.db.get('SELECT * FROM wallpaper_groups WHERE is_default = 1 AND deleted_at IS NULL');
  }
}
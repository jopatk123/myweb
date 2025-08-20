/**
 * 壁纸分组模型
 */
export class WallpaperGroupModel {
  constructor(db) {
    this.db = db;
  }

  findAll() {
    return this.db.prepare('SELECT * FROM wallpaper_groups WHERE deleted_at IS NULL ORDER BY is_default DESC, created_at ASC').all();
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM wallpaper_groups WHERE id = ? AND deleted_at IS NULL').get(id);
  }

  create(data) {
    const { name } = data;
    const sql = 'INSERT INTO wallpaper_groups (name) VALUES (?)';
    
    const result = this.db.prepare(sql).run(name);
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

    const sql = `UPDATE wallpaper_groups SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(params);
    
    return this.findById(id);
  }

  delete(id) {
    // 检查是否为默认分组
    const group = this.findById(id);
    if (group?.is_default) {
      throw new Error('不能删除默认分组');
    }

    const sql = 'UPDATE wallpaper_groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
    return this.db.prepare(sql).run(id);
  }

  getDefault() {
    return this.db.prepare('SELECT * FROM wallpaper_groups WHERE is_default = 1 AND deleted_at IS NULL').get();
  }

  getCurrent() {
    return this.db.prepare('SELECT * FROM wallpaper_groups WHERE is_current = 1 AND deleted_at IS NULL').get();
  }

  setCurrent(id) {
    // 先清空当前标记
    this.db.prepare('UPDATE wallpaper_groups SET is_current = 0').run();
    // 设置指定分组为当前
    this.db.prepare('UPDATE wallpaper_groups SET is_current = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL').run(id);
    return this.findById(id);
  }
}
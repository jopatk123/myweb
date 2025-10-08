export class MusicGroupModel {
  constructor(db) {
    this.db = db;
  }

  findAll({ includeDeleted = false } = {}) {
    const where = includeDeleted ? '' : 'WHERE deleted_at IS NULL';
    return this.db
      .prepare(
        `SELECT * FROM music_groups ${where} ORDER BY is_default DESC, created_at ASC`
      )
      .all();
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM music_groups WHERE id = ?').get(id);
  }

  findDefault() {
    return this.db
      .prepare('SELECT * FROM music_groups WHERE is_default = 1 LIMIT 1')
      .get();
  }

  create({ name, isDefault = false }) {
    const existing = this.db
      .prepare('SELECT * FROM music_groups WHERE name = ?')
      .get(name);

    if (existing) {
      if (existing.deleted_at) {
        this.db
          .prepare(
            'UPDATE music_groups SET deleted_at = NULL, is_default = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          )
          .run(isDefault ? 1 : existing.is_default, existing.id);
        return this.findById(existing.id);
      }
      const err = new Error('歌单已存在');
      err.status = 400;
      throw err;
    }

    const stmt = this.db.prepare(
      'INSERT INTO music_groups (name, is_default) VALUES (?, ?)'
    );
    const result = stmt.run(name, isDefault ? 1 : 0);
    return this.findById(result.lastInsertRowid);
  }

  update(id, data = {}) {
    const allowed = {
      name: 'name',
      isDefault: 'is_default',
      is_default: 'is_default',
    };
    const sets = [];
    const params = [];
    for (const [key, column] of Object.entries(allowed)) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sets.push(`${column} = ?`);
        params.push(column === 'is_default' ? (data[key] ? 1 : 0) : data[key]);
      }
    }
    if (!sets.length) return this.findById(id);
    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    this.db
      .prepare(`UPDATE music_groups SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);
    return this.findById(id);
  }

  softDelete(id) {
    const group = this.findById(id);
    if (!group) return null;
    if (group.is_default) {
      const err = new Error('不能删除默认歌单');
      err.status = 400;
      throw err;
    }
    this.db
      .prepare(
        'UPDATE music_groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?'
      )
      .run(id);
    return this.findById(id);
  }
}

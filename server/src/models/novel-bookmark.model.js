export class NovelBookmarkModel {
  constructor(db) {
    this.db = db;
  }

  findById(id) {
    return this.db
      .prepare(
        'SELECT * FROM novel_bookmarks WHERE id = ? AND deleted_at IS NULL'
      )
      .get(id);
  }

  findByBookId(bookId) {
    return this.db
      .prepare(
        'SELECT * FROM novel_bookmarks WHERE book_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
      )
      .all(bookId);
  }

  findByFileId(fileId) {
    return this.db
      .prepare(
        'SELECT * FROM novel_bookmarks WHERE file_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
      )
      .all(fileId);
  }

  findByDeviceId(deviceId) {
    return this.db
      .prepare(
        'SELECT * FROM novel_bookmarks WHERE device_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
      )
      .all(deviceId);
  }

  create({
    bookId,
    fileId = null,
    title,
    chapterIndex = 0,
    scrollPosition = 0,
    note = null,
    deviceId = null,
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO novel_bookmarks (book_id, file_id, title, chapter_index, scroll_position, note, device_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      bookId,
      fileId,
      title,
      chapterIndex,
      scrollPosition,
      note,
      deviceId
    );
    return this.findById(res.lastInsertRowid);
  }

  update(id, updates) {
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.chapterIndex !== undefined) {
      fields.push('chapter_index = ?');
      values.push(updates.chapterIndex);
    }
    if (updates.scrollPosition !== undefined) {
      fields.push('scroll_position = ?');
      values.push(updates.scrollPosition);
    }
    if (updates.note !== undefined) {
      fields.push('note = ?');
      values.push(updates.note);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE novel_bookmarks 
      SET ${fields.join(', ')}
      WHERE id = ? AND deleted_at IS NULL
    `);

    const res = stmt.run(...values);
    return res.changes > 0 ? this.findById(id) : null;
  }

  delete(id) {
    // 物理删除记录，保证跨设备同步中已删除项不会被再次下发
    return this.db
      .prepare(
        `
      DELETE FROM novel_bookmarks
      WHERE id = ?
    `
      )
      .run(id);
  }

  deleteByBookId(bookId) {
    // 物理删除指定书籍的所有书签
    return this.db
      .prepare(
        `
      DELETE FROM novel_bookmarks
      WHERE book_id = ?
    `
      )
      .run(bookId);
  }

  // 获取所有书签（用于同步）
  findAll() {
    return this.db
      .prepare(
        'SELECT * FROM novel_bookmarks WHERE deleted_at IS NULL ORDER BY created_at DESC'
      )
      .all();
  }

  // 批量创建书签（用于同步）
  batchCreate(bookmarks) {
    const stmt = this.db.prepare(`
      INSERT INTO novel_bookmarks (book_id, file_id, title, chapter_index, scroll_position, note, device_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(bookmarks => {
      const results = [];
      for (const bookmark of bookmarks) {
        const res = stmt.run(
          bookmark.bookId,
          bookmark.fileId,
          bookmark.title,
          bookmark.chapterIndex,
          bookmark.scrollPosition,
          bookmark.note,
          bookmark.deviceId
        );
        results.push(this.findById(res.lastInsertRowid));
      }
      return results;
    });

    return transaction(bookmarks);
  }
}

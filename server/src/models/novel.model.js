export class NovelModel {
  constructor(db) {
    this.db = db;
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM novels WHERE id = ?').get(id);
  }

  create({
    title = null,
    author = null,
    originalName,
    storedName,
    filePath,
    mimeType,
    fileSize,
    fileUrl = null,
    uploaderId = null,
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO novels (title, author, original_name, stored_name, file_path, mime_type, file_size, file_url, uploader_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(
      title,
      author,
      originalName,
      storedName,
      filePath,
      mimeType,
      fileSize,
      fileUrl,
      uploaderId
    );
    return this.findById(res.lastInsertRowid);
  }

  deleteByFilePath(filePath) {
    return this.db
      .prepare('DELETE FROM novels WHERE file_path = ?')
      .run(filePath);
  }

  findByFilePath(filePath) {
    return this.db
      .prepare('SELECT * FROM novels WHERE file_path = ?')
      .get(filePath);
  }
}

export class MusicTrackModel {
  constructor(db) {
    this.db = db;
  }

  findAll({ page = 1, limit = 20, search = '' } = {}) {
    const whereClauses = [];
    const params = [];

    if (search && search.trim()) {
      const like = `%${search.trim()}%`;
      whereClauses.push(
        '(title LIKE ? OR artist LIKE ? OR album LIKE ? OR genre LIKE ? OR original_name LIKE ?)'
      );
      params.push(like, like, like, like, like);
    }

    const where = whereClauses.length
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';
    const totalRow = this.db
      .prepare(`SELECT COUNT(1) AS total FROM music_tracks ${where}`)
      .get(...params);
    const total = totalRow?.total || 0;
    const offset = (Number(page) - 1) * Number(limit);

    const rows = this.db
      .prepare(
        `SELECT * FROM music_tracks ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, Number(limit), offset);

    return { items: rows, total };
  }

  findById(id) {
    return this.db.prepare('SELECT * FROM music_tracks WHERE id = ?').get(id);
  }

  findByFileId(fileId) {
    return this.db
      .prepare('SELECT * FROM music_tracks WHERE file_id = ?')
      .get(fileId);
  }

  create(data) {
    const stmt = this.db.prepare(`
      INSERT INTO music_tracks (
        title,
        artist,
        album,
        genre,
        duration_seconds,
        bitrate,
        sample_rate,
        track_number,
        disc_number,
        year,
        original_name,
        stored_name,
        file_path,
        mime_type,
        file_size,
        file_url,
        uploader_id,
        file_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const res = stmt.run(
      data.title,
      data.artist || null,
      data.album || null,
      data.genre || null,
      data.durationSeconds ?? data.duration_seconds ?? null,
      data.bitrate ?? null,
      data.sampleRate ?? data.sample_rate ?? null,
      data.trackNumber ?? data.track_number ?? null,
      data.discNumber ?? data.disc_number ?? null,
      data.year ?? null,
      data.originalName || data.original_name,
      data.storedName || data.stored_name,
      data.filePath || data.file_path,
      data.mimeType || data.mime_type || null,
      data.fileSize ?? data.file_size ?? null,
      data.fileUrl || data.file_url || null,
      data.uploaderId || data.uploader_id || null,
      data.fileId || data.file_id
    );

    return this.findById(res.lastInsertRowid);
  }

  update(id, data = {}) {
    const allowed = {
      title: 'title',
      artist: 'artist',
      album: 'album',
      genre: 'genre',
      durationSeconds: 'duration_seconds',
      duration_seconds: 'duration_seconds',
      bitrate: 'bitrate',
      sampleRate: 'sample_rate',
      sample_rate: 'sample_rate',
      trackNumber: 'track_number',
      track_number: 'track_number',
      discNumber: 'disc_number',
      disc_number: 'disc_number',
      year: 'year',
    };

    const sets = [];
    const params = [];

    for (const [key, column] of Object.entries(allowed)) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sets.push(`${column} = ?`);
        params.push(data[key]);
      }
    }

    if (!sets.length) return this.findById(id);

    sets.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    this.db
      .prepare(`UPDATE music_tracks SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);

    return this.findById(id);
  }

  delete(id) {
    return this.db.prepare('DELETE FROM music_tracks WHERE id = ?').run(id);
  }
}

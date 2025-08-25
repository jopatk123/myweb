export class WorkTimerService {
  constructor(db) {
    this.db = db;
  }

  // 以本地时区返回 YYYY-MM-DD 字符串
  getLocalDateString(dateInput) {
    const d = dateInput ? new Date(dateInput) : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  upsertSession(session) {
    const stmt = this.db.prepare(`
      INSERT INTO work_sessions (id, date, start_time, last_update, end_time, duration, target_end_time, is_active, created_at, updated_at)
      VALUES (@id, @date, @start_time, @last_update, @end_time, @duration, @target_end_time, @is_active, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        last_update = @last_update,
        end_time = COALESCE(@end_time, end_time),
        duration = @duration,
        target_end_time = COALESCE(@target_end_time, target_end_time),
        is_active = @is_active,
        updated_at = CURRENT_TIMESTAMP
    `);

    return stmt.run(session);
  }

  incrementSessionDuration(id, incrementMs, lastUpdateIso) {
    const get = this.db.prepare(`SELECT * FROM work_sessions WHERE id = ?`);
    const row = get.get(id);
    if (!row) return null;

    const newDuration = (row.duration || 0) + incrementMs;
    const upd = this.db.prepare(`
      UPDATE work_sessions SET duration = ?, last_update = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    upd.run(newDuration, lastUpdateIso, id);

    // 维护总时长（可选）
    try {
      const statsRow = this.db
        .prepare(`SELECT total_ms FROM work_stats WHERE id = 1`)
        .get();
      if (statsRow) {
        const updStats = this.db.prepare(
          `UPDATE work_stats SET total_ms = total_ms + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`
        );
        updStats.run(Number(incrementMs || 0));
      }
    } catch {
      // 静默处理数据库错误
    }

    // 按本地日累计
    try {
      const localDate = this.getLocalDateString(lastUpdateIso);
      const upsertDaily = this.db.prepare(`
        INSERT INTO work_daily_totals (date, total_ms, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(date) DO UPDATE SET
          total_ms = work_daily_totals.total_ms + excluded.total_ms,
          updated_at = CURRENT_TIMESTAMP
      `);
      upsertDaily.run(localDate, Number(incrementMs || 0));
    } catch {
      // 静默处理数据库错误
    }

    return this.getTotals();
  }

  endSession(id, endTimeIso) {
    const get = this.db.prepare(`SELECT * FROM work_sessions WHERE id = ?`);
    const row = get.get(id);
    if (!row) return null;
    const upd = this.db.prepare(`
      UPDATE work_sessions SET end_time = ?, is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    upd.run(endTimeIso, id);
    return this.getTotals();
  }

  getTotals() {
    const now = new Date();
    const todayStr = this.getLocalDateString(now);
    // 周一为一周起始
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = this.getLocalDateString(weekStart);

    // 统一从 work_sessions 聚合，避免不同口径不一致
    const totalRow = this.db
      .prepare(`SELECT SUM(duration) as total FROM work_sessions`)
      .get();
    const todayRow = this.db
      .prepare(
        `SELECT SUM(duration) as today FROM work_sessions WHERE date = ?`
      )
      .get(todayStr);
    const weekRow = this.db
      .prepare(
        `SELECT SUM(duration) as week FROM work_sessions WHERE date >= ?`
      )
      .get(weekStartStr);

    return {
      totalMs: totalRow.total || 0,
      todayMs: todayRow.today || 0,
      weekMs: weekRow.week || 0,
    };
  }
}

export default WorkTimerService;

/**
 * 工作计时服务
 *
 * 分层权衡：该模块均为单表简单读写与聚合（upsert / 自增 / SUM），
 * 无复杂业务查询，直接使用 db.prepare 而未单独抽 model 层，
 * 避免仅做转发的过度分层。
 */
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

  /**
   * 心跳自增累计时长。
   * 使用单语句原子自增（duration = duration + ?），避免 SELECT-后-JS 聚合-再-UPDATE
   * 的读-改-写模式：一旦未来引入多进程/异步驱动即会丢失并发自增。
   */
  incrementSessionDuration(id, incrementMs, lastUpdateIso) {
    const upd = this.db.prepare(`
      UPDATE work_sessions
      SET duration = COALESCE(duration, 0) + ?, last_update = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const result = upd.run(incrementMs, lastUpdateIso, id);
    if (result.changes === 0) return null;

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

    // 单次全表扫描同时聚合 total/today/week（心跳高频路径，避免 3 次扫描）；
    // work_sessions 只增不删，行数量级为每日数行，全表 SUM 成本可接受
    const row = this.db
      .prepare(
        `
        SELECT
          SUM(duration) AS total,
          SUM(CASE WHEN date = ? THEN duration ELSE 0 END) AS today,
          SUM(CASE WHEN date >= ? THEN duration ELSE 0 END) AS week
        FROM work_sessions
      `
      )
      .get(todayStr, weekStartStr);

    return {
      totalMs: row.total || 0,
      todayMs: row.today || 0,
      weekMs: row.week || 0,
    };
  }
}

export default WorkTimerService;

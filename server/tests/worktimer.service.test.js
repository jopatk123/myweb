/* eslint-env jest */
import { WorkTimerService } from '../src/services/worktimer.service.js';
import { createTestDatabase, closeTestDatabase } from './helpers/test-db.js';

describe('WorkTimerService database integration', () => {
  let db;
  let service;

  beforeAll(async () => {
    db = await createTestDatabase();
    service = new WorkTimerService(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    db.prepare('DELETE FROM work_sessions').run();
    db.prepare('DELETE FROM work_daily_totals').run();
    db.prepare('UPDATE work_stats SET total_ms = 0 WHERE id = 1').run();
  });

  test('upsertSession inserts new records and updates existing ones', () => {
    const today = service.getLocalDateString();
    const startIso = new Date().toISOString();

    service.upsertSession({
      id: 'session-1',
      date: today,
      start_time: startIso,
      last_update: startIso,
      end_time: null,
      duration: 0,
      target_end_time: null,
      is_active: 1,
    });

    let row = db
      .prepare('SELECT * FROM work_sessions WHERE id = ?')
      .get('session-1');
    expect(row).toBeDefined();
    expect(row.is_active).toBe(1);
    expect(row.duration).toBe(0);

    service.upsertSession({
      id: 'session-1',
      date: today,
      start_time: startIso,
      last_update: startIso,
      end_time: null,
      duration: 60000,
      target_end_time: '2025-01-01T10:00:00.000Z',
      is_active: 1,
    });

    row = db
      .prepare('SELECT * FROM work_sessions WHERE id = ?')
      .get('session-1');
    expect(row.duration).toBe(60000);
    expect(row.target_end_time).toBe('2025-01-01T10:00:00.000Z');
    expect(row.updated_at).not.toBeUndefined();
  });

  test('incrementSessionDuration updates aggregates and totals', () => {
    const today = service.getLocalDateString();
    const nowIso = new Date().toISOString();

    service.upsertSession({
      id: 'session-2',
      date: today,
      start_time: nowIso,
      last_update: nowIso,
      end_time: null,
      duration: 1000,
      target_end_time: null,
      is_active: 1,
    });

    const totals = service.incrementSessionDuration('session-2', 9000, nowIso);

    expect(totals.totalMs).toBe(10000);
    expect(totals.todayMs).toBeGreaterThanOrEqual(10000);
    expect(totals.weekMs).toBeGreaterThanOrEqual(10000);

    const sessionRow = db
      .prepare('SELECT * FROM work_sessions WHERE id = ?')
      .get('session-2');
    expect(sessionRow.duration).toBe(10000);
    expect(sessionRow.last_update).toBe(nowIso);

    const statsRow = db
      .prepare('SELECT total_ms FROM work_stats WHERE id = 1')
      .get();
    expect(statsRow.total_ms).toBe(9000);

    const localDate = service.getLocalDateString(nowIso);
    const dailyRow = db
      .prepare('SELECT total_ms FROM work_daily_totals WHERE date = ?')
      .get(localDate);
    expect(dailyRow.total_ms).toBe(9000);
  });

  test('endSession marks session inactive and retains totals', () => {
    const today = service.getLocalDateString();
    const startIso = new Date().toISOString();

    service.upsertSession({
      id: 'session-3',
      date: today,
      start_time: startIso,
      last_update: startIso,
      end_time: null,
      duration: 5000,
      target_end_time: null,
      is_active: 1,
    });

    const totalsBefore = service.getTotals();
    expect(totalsBefore.totalMs).toBe(5000);

    const endIso = new Date().toISOString();
    const totalsAfter = service.endSession('session-3', endIso);

    const row = db
      .prepare('SELECT * FROM work_sessions WHERE id = ?')
      .get('session-3');
    expect(row.is_active).toBe(0);
    expect(row.end_time).toBe(endIso);

    expect(totalsAfter.totalMs).toBe(5000);
    expect(totalsAfter.todayMs).toBeGreaterThanOrEqual(5000);
  });
});

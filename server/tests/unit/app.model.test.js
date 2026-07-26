import { jest } from '@jest/globals';
import { AppModel } from '../../src/models/app.model.js';
import { createTestDatabase, closeTestDatabase } from '../helpers/test-db.js';

describe('AppModel extra branches', () => {
  let db;
  let model;

  beforeAll(async () => {
    db = await createTestDatabase();
    model = new AppModel(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    db.prepare('DELETE FROM apps').run();
    db.prepare('DELETE FROM app_groups WHERE is_default = 0').run();
    jest.restoreAllMocks();
  });

  test('findAll filters by groupId when provided', () => {
    const groupA = db
      .prepare('INSERT INTO app_groups (name, slug) VALUES (?, ?)')
      .run('组A', 'group-a').lastInsertRowid;
    const groupB = db
      .prepare('INSERT INTO app_groups (name, slug) VALUES (?, ?)')
      .run('组B', 'group-b').lastInsertRowid;

    model.create({ name: 'A1', slug: 'a1', group_id: groupA });
    model.create({ name: 'B1', slug: 'b1', group_id: groupB });

    const rows = model.findAll({ groupId: groupA });

    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      expect(Number(row.group_id)).toBe(Number(groupA));
    }
  });

  test('update returns existing row when payload has no mapped fields', () => {
    const created = model.create({ name: 'NoField', slug: 'nofield' });

    const updated = model.update(created.id, { unknownKey: 'value' });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('NoField');
  });

  test('countByIconFilename returns 0 when query row is undefined', () => {
    const fakeDb = {
      prepare: () => ({
        get: () => undefined,
      }),
    };

    const fakeModel = new AppModel(fakeDb);
    expect(fakeModel.countByIconFilename('missing.png')).toBe(0);
  });

  test('moveToGroup ignores console logging failures', () => {
    const fakeDb = {
      prepare: () => ({
        run: () => ({ changes: 1 }),
      }),
    };
    const fakeModel = new AppModel(fakeDb);

    jest.spyOn(console, 'log').mockImplementation(() => {
      throw new Error('log failed');
    });

    const changes = fakeModel.moveToGroup([1, 2], 99);
    expect(changes).toBe(1);
  });

  test('setAutostart does not touch soft-deleted apps (D3 regression)', () => {
    const created = model.create({
      name: '软删应用',
      slug: 'softdel-autostart',
    });
    // 软删
    db.prepare(
      'UPDATE apps SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(created.id);

    const result = model.setAutostart(created.id, true);
    // findById 过滤 deleted_at IS NULL，应返回 undefined
    expect(result).toBeUndefined();
    // UPDATE 不应改写已软删应用
    const row = db
      .prepare('SELECT is_autostart FROM apps WHERE id = ?')
      .get(created.id);
    expect(row.is_autostart).toBe(0);
  });

  test('setVisible does not touch soft-deleted apps (D3 regression)', () => {
    const created = model.create({
      name: '软删应用2',
      slug: 'softdel-visible',
    });
    db.prepare(
      'UPDATE apps SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(created.id);

    const result = model.setVisible(created.id, true);
    expect(result).toBeUndefined();
    const row = db
      .prepare('SELECT is_visible FROM apps WHERE id = ?')
      .get(created.id);
    expect(row.is_visible).toBe(1); // create 默认 is_visible=1，未被改写
  });

  test('moveToGroup does not touch soft-deleted apps (D3 regression)', () => {
    const groupA = db
      .prepare('INSERT INTO app_groups (name, slug) VALUES (?, ?)')
      .run('组MvA', 'mv-group-a').lastInsertRowid;
    const groupB = db
      .prepare('INSERT INTO app_groups (name, slug) VALUES (?, ?)')
      .run('组MvB', 'mv-group-b').lastInsertRowid;

    const alive = model.create({
      name: 'Alive',
      slug: 'mv-alive',
      group_id: groupA,
    });
    const dead = model.create({
      name: 'Dead',
      slug: 'mv-dead',
      group_id: groupA,
    });
    db.prepare(
      'UPDATE apps SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(dead.id);

    model.moveToGroup([alive.id, dead.id], groupB);

    const aliveRow = db
      .prepare('SELECT group_id FROM apps WHERE id = ?')
      .get(alive.id);
    expect(Number(aliveRow.group_id)).toBe(Number(groupB));

    const deadRow = db
      .prepare('SELECT group_id FROM apps WHERE id = ?')
      .get(dead.id);
    expect(Number(deadRow.group_id)).toBe(Number(groupA));
  });
});

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
});

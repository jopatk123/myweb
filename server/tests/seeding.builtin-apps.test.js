import Database from 'better-sqlite3';
import { jest } from '@jest/globals';

// Mock logger so seedLogger.warn / .info are captured
const mockWarn = jest.fn();
const mockInfo = jest.fn();
jest.unstable_mockModule('../../src/utils/logger.js', () => {
  const childLogger = {
    debug: jest.fn(),
    info: mockInfo,
    warn: mockWarn,
    error: jest.fn(),
    child: () => childLogger,
  };
  return { default: childLogger, logger: childLogger };
});

const { ensureBuiltinApps, seedAppsIfEmpty } = await import(
  '../src/db/seeding.js'
);

function createSeedingDb() {
  const db = new Database(':memory:');

  db.exec(`
    CREATE TABLE app_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      deleted_at DATETIME DEFAULT NULL
    );

    CREATE TABLE apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      icon_filename TEXT,
      group_id INTEGER,
      is_visible INTEGER DEFAULT 1,
      is_autostart INTEGER DEFAULT 0,
      is_builtin INTEGER DEFAULT 0,
      target_url TEXT,
      is_deleted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.prepare(
    "INSERT INTO app_groups (name, slug, deleted_at) VALUES ('默认', 'default', NULL)"
  ).run();

  return db;
}

describe('ensureBuiltinApps', () => {
  test('marks obsolete builtin apps as deleted and preserves current builtins', () => {
    const db = createSeedingDb();

    const insert = db.prepare(
      `INSERT INTO apps (name, slug, description, icon_filename, is_visible, is_builtin, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    insert.run('贪吃蛇', 'snake', 'old builtin', 'snake-128.png', 1, 1, 0);
    insert.run(
      '计算器',
      'calculator',
      'existing builtin',
      'calculator-128.png',
      1,
      1,
      0
    );

    ensureBuiltinApps(db);

    const snake = db
      .prepare('SELECT is_deleted FROM apps WHERE slug = ?')
      .get('snake');
    const calculator = db
      .prepare('SELECT is_deleted, is_builtin FROM apps WHERE slug = ?')
      .get('calculator');
    const notebook = db
      .prepare('SELECT is_deleted, is_builtin FROM apps WHERE slug = ?')
      .get('notebook');

    expect(snake.is_deleted).toBe(1);
    expect(calculator).toMatchObject({ is_deleted: 0, is_builtin: 1 });
    expect(notebook).toMatchObject({ is_deleted: 0, is_builtin: 1 });

    db.close();
  });

  test('restores deleted builtin app and patches missing metadata', () => {
    const db = createSeedingDb();

    const insert = db.prepare(
      `INSERT INTO apps (name, slug, description, icon_filename, is_visible, is_builtin, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    insert.run('旧笔记本', 'notebook', null, null, 1, 0, 1);

    ensureBuiltinApps(db);

    const notebook = db
      .prepare(
        'SELECT is_deleted, is_builtin, description, icon_filename FROM apps WHERE slug = ?'
      )
      .get('notebook');

    expect(notebook.is_deleted).toBe(0);
    expect(notebook.is_builtin).toBe(1);
    expect(notebook.description).toBeTruthy();
    expect(notebook.icon_filename).toBeTruthy();

    db.close();
  });

  test('handles db errors without throwing', () => {
    mockWarn.mockClear();
    const badDb = {
      prepare() {
        throw new Error('boom');
      },
    };

    expect(() => ensureBuiltinApps(badDb)).not.toThrow();
    expect(mockWarn).toHaveBeenCalled();
  });
});

describe('seedAppsIfEmpty', () => {
  test('seeds calculator and notebook when apps table is empty', () => {
    const db = createSeedingDb();

    seedAppsIfEmpty(db);

    const calculator = db
      .prepare('SELECT slug, is_builtin FROM apps WHERE slug = ?')
      .get('calculator');
    const notebook = db
      .prepare('SELECT slug, is_builtin FROM apps WHERE slug = ?')
      .get('notebook');

    expect(calculator).toMatchObject({ slug: 'calculator', is_builtin: 1 });
    expect(notebook).toMatchObject({ slug: 'notebook', is_builtin: 1 });

    db.close();
  });

  test('does not seed when non-deleted apps already exist', () => {
    const db = createSeedingDb();
    db.prepare(
      `INSERT INTO apps (name, slug, description, icon_filename, is_visible, is_builtin, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run('Existing App', 'existing-app', 'existing', 'x.png', 1, 0, 0);

    seedAppsIfEmpty(db);

    const count = db
      .prepare('SELECT COUNT(1) AS c FROM apps WHERE is_deleted = 0')
      .get();
    expect(count.c).toBe(1);

    db.close();
  });

  test('handles db errors without throwing', () => {
    mockWarn.mockClear();
    const badDb = {
      prepare() {
        throw new Error('seed-fail');
      },
    };

    expect(() => seedAppsIfEmpty(badDb)).not.toThrow();
    expect(mockWarn).toHaveBeenCalled();
  });
});

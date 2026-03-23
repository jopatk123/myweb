import Database from 'better-sqlite3';
import { ensureBuiltinApps } from '../src/db/seeding.js';

describe('ensureBuiltinApps', () => {
  test('marks obsolete builtin apps as deleted and preserves current builtins', () => {
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
});

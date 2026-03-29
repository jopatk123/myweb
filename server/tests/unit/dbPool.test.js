import { jest } from '@jest/globals';
import Database from 'better-sqlite3';
import {
  setDb,
  getDb,
  wrapTransaction,
  runSafe,
} from '../../src/utils/dbPool.js';

let db;

beforeAll(() => {
  db = new Database(':memory:');
  db.exec(
    'CREATE TABLE IF NOT EXISTS dbpool_test (id INTEGER PRIMARY KEY, val TEXT)'
  );
  setDb(db);
});

afterAll(() => {
  db?.close();
  setDb(null);
});

describe('getDb()', () => {
  test('returns the db instance when initialized', () => {
    expect(getDb()).toBe(db);
  });

  test('throws when not initialized', () => {
    setDb(null);
    expect(() => getDb()).toThrow('Database not initialized');
    setDb(db); // restore
  });
});

describe('wrapTransaction()', () => {
  test('wraps a function in a transaction and returns result', () => {
    const insert = wrapTransaction(db, () => {
      return db
        .prepare('INSERT INTO dbpool_test (val) VALUES (?)')
        .run('txn-test');
    });
    const result = insert();
    expect(result.changes).toBe(1);
  });

  test('wrapped function receives arguments', () => {
    const insertWithArg = wrapTransaction(db, val => {
      return db.prepare('INSERT INTO dbpool_test (val) VALUES (?)').run(val);
    });
    const result = insertWithArg('arg-test');
    expect(result.changes).toBe(1);
  });
});

describe('runSafe()', () => {
  test('returns the result of the function', () => {
    const result = runSafe(db, () => 42);
    expect(result).toBe(42);
  });

  test('passes db as argument to the function', () => {
    const result = runSafe(db, passedDb => passedDb === db);
    expect(result).toBe(true);
  });

  test('rethrows error and logs via console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('safe-test-error');
    expect(() =>
      runSafe(db, () => {
        throw err;
      })
    ).toThrow('safe-test-error');
    expect(spy).toHaveBeenCalledWith('dbPool.runSafe error:', err);
    spy.mockRestore();
  });
});

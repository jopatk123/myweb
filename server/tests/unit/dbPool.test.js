const Database = (await import('better-sqlite3')).default;
const { setDb, getDb } = await import('../../src/utils/dbPool.js');

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

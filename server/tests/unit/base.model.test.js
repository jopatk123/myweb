import { jest } from '@jest/globals';
import { BaseModel } from '../../src/models/base.model.js';

describe('BaseModel.paginate', () => {
  test('paginates only allowed tables with normalized ORDER BY clauses', () => {
    const get = jest.fn(() => ({ total: 2 }));
    const all = jest.fn(() => [{ id: 1 }]);
    const db = {
      prepare: jest.fn(() => ({ get, all })),
    };
    const model = new BaseModel(db);

    const result = model.paginate(
      'apps',
      'WHERE deleted_at IS NULL',
      [1],
      'created_at desc',
      10,
      2
    );

    expect(db.prepare).toHaveBeenNthCalledWith(
      1,
      'SELECT COUNT(*) AS total FROM apps WHERE deleted_at IS NULL'
    );
    expect(db.prepare).toHaveBeenNthCalledWith(
      2,
      'SELECT * FROM apps WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    expect(get).toHaveBeenCalledWith(1);
    expect(all).toHaveBeenCalledWith(1, 10, 10);
    expect(result).toEqual({
      items: [{ id: 1 }],
      total: 2,
      page: 2,
      limit: 10,
    });
  });

  test('rejects unsupported tables', () => {
    const model = new BaseModel({
      prepare: jest.fn(),
    });

    expect(() =>
      model.paginate('users', '', [], 'created_at DESC', 10, 1)
    ).toThrow('Unsupported pagination table: users');
  });

  test('rejects unsafe ORDER BY clauses', () => {
    const model = new BaseModel({
      prepare: jest.fn(),
    });

    expect(() =>
      model.paginate('apps', '', [], 'created_at DESC, id DESC', 10, 1)
    ).toThrow('Unsafe ORDER BY clause: created_at DESC, id DESC');
  });
});

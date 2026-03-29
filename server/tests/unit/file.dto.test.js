/**
 * file.dto.js 验证 schema 单元测试
 */
import { jest } from '@jest/globals';
import {
  listFilesSchema,
  validateId,
  validateQuery,
} from '../../src/dto/file.dto.js';

// ─── listFilesSchema ─────────────────────────────────────────────────────────

describe('listFilesSchema', () => {
  test('accepts valid query with defaults', () => {
    const { error, value } = listFilesSchema.validate({});
    expect(error).toBeUndefined();
    expect(value.page).toBe(1);
    expect(value.limit).toBe(20);
  });

  test('accepts page and limit within range', () => {
    const { error, value } = listFilesSchema.validate({ page: 3, limit: 50 });
    expect(error).toBeUndefined();
    expect(value.page).toBe(3);
    expect(value.limit).toBe(50);
  });

  test('rejects page < 1', () => {
    const { error } = listFilesSchema.validate({ page: 0 });
    expect(error).toBeDefined();
  });

  test('rejects limit > 200', () => {
    const { error } = listFilesSchema.validate({ limit: 201 });
    expect(error).toBeDefined();
  });

  test('accepts search and type as optional strings', () => {
    const { error, value } = listFilesSchema.validate({
      search: 'hello',
      type: 'image',
    });
    expect(error).toBeUndefined();
    expect(value.search).toBe('hello');
    expect(value.type).toBe('image');
  });

  test('accepts empty string for search and type', () => {
    const { error } = listFilesSchema.validate({ search: '', type: '' });
    expect(error).toBeUndefined();
  });

  test('rejects search longer than 200 characters', () => {
    const { error } = listFilesSchema.validate({ search: 'a'.repeat(201) });
    expect(error).toBeDefined();
  });

  test('coerces string numbers to integers', () => {
    const { error, value } = listFilesSchema.validate({
      page: '2',
      limit: '30',
    });
    expect(error).toBeUndefined();
    expect(value.page).toBe(2);
    expect(value.limit).toBe(30);
  });
});

// ─── validateId middleware ───────────────────────────────────────────────────

function mockRes() {
  const res = {
    _status: null,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
  };
  return res;
}

describe('validateId middleware', () => {
  test('calls next() when id is a positive integer string', () => {
    const middleware = validateId('id');
    const req = { params: { id: '5' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.params.id).toBe(5); // coerced to number
  });

  test('returns 400 when id is 0', () => {
    const middleware = validateId('id');
    const req = { params: { id: '0' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
  });

  test('returns 400 when id is negative', () => {
    const middleware = validateId('id');
    const req = { params: { id: '-1' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
  });

  test('returns 400 when id is NaN string', () => {
    const middleware = validateId('id');
    const req = { params: { id: 'abc' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
  });

  test('returns 400 when id is a float', () => {
    const middleware = validateId('id');
    const req = { params: { id: '1.5' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
  });

  test('works with custom param name', () => {
    const middleware = validateId('wallpaperId');
    const req = { params: { wallpaperId: '42' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.params.wallpaperId).toBe(42);
  });
});

// ─── validateQuery middleware (re-exported from wallpaper.dto) ───────────────

describe('validateQuery middleware with listFilesSchema', () => {
  test('populates defaults when query is empty', () => {
    const middleware = validateQuery(listFilesSchema);
    const req = { query: {} };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.query.page).toBe(1);
    expect(req.query.limit).toBe(20);
  });

  test('returns 400 for invalid query params', () => {
    const middleware = validateQuery(listFilesSchema);
    const req = { query: { limit: '999' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(400);
    expect(res._body.code).toBe(400);
  });
});

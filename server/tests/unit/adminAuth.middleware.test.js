import { jest } from '@jest/globals';
import { createHash } from 'crypto';

function makeReqRes(headers = {}, body = {}, query = {}) {
  const req = {
    get: key => headers[key.toLowerCase()] || headers[key] || null,
    headers,
    body,
    query,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('adminAuth middleware - no token configured', () => {
  test('fails closed when no token is configured', async () => {
    jest.unstable_mockModule('../../src/config/env.js', () => ({
      appEnv: { isProduction: false },
      getAdminTokenConfig: () => ({ token: '', tokenHash: '' }),
    }));
    const { createFilesAdminGuard } = await import(
      '../../src/middleware/adminAuth.middleware.js'
    );
    const guard = createFilesAdminGuard();
    const { req, res, next } = makeReqRes();
    guard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 503,
        success: false,
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe('adminAuth middleware - plaintext token', () => {
  let guard;

  beforeAll(async () => {
    jest.resetModules();
    jest.unstable_mockModule('../../src/config/env.js', () => ({
      appEnv: { isProduction: false },
      getAdminTokenConfig: () => ({ token: 'secret123', tokenHash: '' }),
    }));
    const { createFilesAdminGuard } = await import(
      '../../src/middleware/adminAuth.middleware.js'
    );
    guard = createFilesAdminGuard();
  });

  test('passes with correct token in x-admin-token header', () => {
    const { req, res, next } = makeReqRes({ 'x-admin-token': 'secret123' });
    guard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 401 with wrong token', () => {
    const { req, res, next } = makeReqRes({ 'x-admin-token': 'wrongtoken' });
    guard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 with no token', () => {
    const { req, res, next } = makeReqRes();
    guard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('passes with token in x-admin-key header', () => {
    const { req, res, next } = makeReqRes({ 'x-admin-key': 'secret123' });
    guard(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('returns 401 with tokens of different length', () => {
    const { req, res, next } = makeReqRes({ 'x-admin-token': 'short' });
    guard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('adminAuth middleware - hashed token', () => {
  let guardHashed;

  beforeAll(async () => {
    jest.resetModules();
    const hash = createHash('sha256').update('hashedSecret').digest('hex');
    jest.unstable_mockModule('../../src/config/env.js', () => ({
      appEnv: { isProduction: false },
      getAdminTokenConfig: () => ({ token: '', tokenHash: hash }),
    }));
    const { createFilesAdminGuard } = await import(
      '../../src/middleware/adminAuth.middleware.js'
    );
    guardHashed = createFilesAdminGuard();
  });

  test('passes with correct plaintext token when hash is stored', () => {
    const { req, res, next } = makeReqRes({ 'x-admin-token': 'hashedSecret' });
    guardHashed(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('returns 401 with wrong plain text when hash stored', () => {
    const { req, res, next } = makeReqRes({ 'x-admin-token': 'wrongSecret' });
    guardHashed(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

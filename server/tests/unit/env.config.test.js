import { jest } from '@jest/globals';
import path from 'path';

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  Object.keys(process.env).forEach(key => {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  });
  Object.assign(process.env, ORIGINAL_ENV);
}

async function loadEnvModule() {
  jest.resetModules();
  return import('../../src/config/env.js');
}

describe('config/env', () => {
  afterEach(() => {
    restoreEnv();
    jest.resetModules();
  });

  test('uses sensible defaults when not configured', async () => {
    delete process.env.CORS_ORIGIN;
    delete process.env.DB_PATH;

    const { appEnv, isCorsOriginAllowed, resolveDatabasePath } =
      await loadEnvModule();

    expect(appEnv.cors.allowAll).toBe(false);
    expect(appEnv.cors.effective).toContain('http://localhost:3000');
    expect(isCorsOriginAllowed('http://localhost:3000')).toBe(true);
    expect(isCorsOriginAllowed('http://evil.com')).toBe(false);

    const resolvedDbPath = resolveDatabasePath();
    expect(resolvedDbPath).toBe(appEnv.database.defaultFile);
    expect(path.isAbsolute(resolvedDbPath)).toBe(true);
  });

  test('respects wildcard CORS configuration', async () => {
    process.env.CORS_ORIGIN = '*';

    const { appEnv, isCorsOriginAllowed } = await loadEnvModule();

    expect(appEnv.cors.allowAll).toBe(true);
    expect(isCorsOriginAllowed('http://anywhere.test')).toBe(true);
  });

  test('applies database path override helper', async () => {
    const overridePath = '/tmp/myweb-test.db';

    const { resolveDatabasePath, applyDatabasePathOverride } =
      await loadEnvModule();

    expect(resolveDatabasePath(overridePath)).toBe(overridePath);

    applyDatabasePathOverride(overridePath);
    expect(process.env.DB_PATH).toBe(overridePath);
  });

  test('reads admin token mapping via helper', async () => {
    process.env.FILES_ADMIN_TOKEN = 'plain-token';
    process.env.FILES_ADMIN_TOKEN_HASH = 'hashed-token';

    const { getAdminTokenConfig } = await loadEnvModule();
    const config = getAdminTokenConfig('FILES_ADMIN_TOKEN');

    expect(config).toEqual({ token: 'plain-token', tokenHash: 'hashed-token' });
  });
});

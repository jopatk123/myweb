/**
 * CSP 安全策略测试
 *
 * 验证生产环境下 Content-Security-Policy 不包含过于宽松的指令，
 * 防止 XSS 注入执行（OWASP A05）
 */
import request from 'supertest';
import { createApp } from '../src/appFactory.js';

describe('Content-Security-Policy headers', () => {
  let app;
  let db;

  beforeAll(async () => {
    ({ app, db } = await createApp({
      dbPath: ':memory:',
      seedBuiltinApps: false,
      silentDbLogs: true,
    }));
  });

  afterAll(() => {
    if (db && typeof db.close === 'function') {
      db.close();
    }
  });

  function getCspHeader(response) {
    return (
      response.headers['content-security-policy'] ||
      response.headers['Content-Security-Policy'] ||
      ''
    );
  }

  test('CSP 头存在', async () => {
    const res = await request(app).get('/api');
    const csp = getCspHeader(res);
    expect(csp.length).toBeGreaterThan(0);
  });

  test("script-src 不包含 'unsafe-eval'", async () => {
    const res = await request(app).get('/api');
    const csp = getCspHeader(res);

    // unsafe-eval 允许 eval()，可被 XSS 利用执行任意代码
    expect(csp).not.toContain("'unsafe-eval'");
  });

  test("script-src 不包含 'unsafe-inline'", async () => {
    const res = await request(app).get('/api');
    const csp = getCspHeader(res);

    // 检查 script-src 中是否包含 unsafe-inline
    // 注意：style-src 允许 unsafe-inline（CSS-in-JS 需要）但 script-src 不允许
    const scriptSrcMatch = csp.match(/script-src([^;]*)/i);
    if (scriptSrcMatch) {
      expect(scriptSrcMatch[1]).not.toContain("'unsafe-inline'");
    }
  });

  test("object-src 为 'none'", async () => {
    const res = await request(app).get('/api');
    const csp = getCspHeader(res);

    expect(csp).toContain("object-src 'none'");
  });

  test("frame-src 为 'none'（防止 clickjacking）", async () => {
    const res = await request(app).get('/api');
    const csp = getCspHeader(res);

    expect(csp).toContain("frame-src 'none'");
  });

  test("base-uri 限制为 'self'（防止 base tag 注入）", async () => {
    const res = await request(app).get('/api');
    const csp = getCspHeader(res);

    expect(csp).toContain("base-uri 'self'");
  });

  test("form-action 限制为 'self'", async () => {
    const res = await request(app).get('/api');
    const csp = getCspHeader(res);

    expect(csp).toContain("form-action 'self'");
  });
});

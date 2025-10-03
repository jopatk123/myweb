/* eslint-env jest */
import request from 'supertest';
import { createApp } from '../src/appFactory.js';

let app;
let db;

beforeAll(async () => {
  ({ app, db } = await createApp({
    dbPath: ':memory:',
    seedBuiltinApps: false,
  }));
});

afterAll(async () => {
  await db?.close?.();
});

beforeEach(() => {
  db.prepare('DELETE FROM apps').run();
});

function insertApp({
  name,
  slug,
  isAutostart = 0,
  isBuiltin = 0,
  targetUrl = null,
}) {
  const stmt = db.prepare(`
    INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_autostart, is_builtin, target_url)
    VALUES (?, ?, NULL, NULL, NULL, 1, ?, ?, ?)
  `);
  const { lastInsertRowid } = stmt.run(
    name,
    slug,
    isAutostart ? 1 : 0,
    isBuiltin ? 1 : 0,
    targetUrl
  );
  return Number(lastInsertRowid);
}

describe('Apps routes - autostart toggles', () => {
  it('updates autostart by numeric id', async () => {
    const id = insertApp({ name: '数字ID应用', slug: 'by-id-app' });

    const res = await request(app)
      .put(`/api/myapps/${id}/autostart`)
      .send({ is_autostart: true })
      .expect(200);

    expect(res.body).toMatchObject({
      code: 200,
      message: '设置成功',
    });
    const payload = res.body.data || {};
    expect(payload.id).toBe(id);
    const row = db
      .prepare('SELECT is_autostart FROM apps WHERE id = ?')
      .get(id);
    expect(row.is_autostart).toBe(1);
  });

  it('updates autostart by slug when id is non-numeric', async () => {
    insertApp({ name: '自定义Slug应用', slug: 'custom-slug', isAutostart: 0 });

    const res = await request(app)
      .put('/api/myapps/custom-slug/autostart')
      .send({ is_autostart: true })
      .expect(200);

    expect(res.body.code).toBe(200);
    const row = db
      .prepare('SELECT is_autostart FROM apps WHERE slug = ?')
      .get('custom-slug');
    expect(row.is_autostart).toBe(1);
  });

  it('returns 404 when toggling autostart for missing app', async () => {
    const res = await request(app)
      .put('/api/myapps/missing-app/autostart')
      .send({ is_autostart: true })
      .expect(404);

    expect(res.body.message).toBe('应用不存在');
  });
});

describe('Apps routes - update app', () => {
  it('updates third-party app successfully', async () => {
    const id = insertApp({
      name: '第三方应用',
      slug: 'third-party',
      targetUrl: 'https://example.com',
    });

    const res = await request(app)
      .put(`/api/myapps/${id}`)
      .send({
        name: '更新后的应用名称',
        target_url: 'https://updated.example.com',
      })
      .expect(200);

    expect(res.body).toMatchObject({
      code: 200,
      message: '更新成功',
    });
    expect(res.body.data.name).toBe('更新后的应用名称');

    // 验证数据库中的更新
    const row = db
      .prepare('SELECT name, target_url FROM apps WHERE id = ?')
      .get(id);
    expect(row.name).toBe('更新后的应用名称');
    expect(row.target_url).toBe('https://updated.example.com');
  });

  it('rejects update for builtin apps', async () => {
    const id = insertApp({
      name: '内置应用',
      slug: 'builtin-app',
      isBuiltin: 1,
    });

    const res = await request(app)
      .put(`/api/myapps/${id}`)
      .send({
        name: '尝试修改内置应用',
      })
      .expect(400);

    expect(res.body.message).toBe('内置应用不允许编辑');
  });

  it('returns 404 when updating non-existent app', async () => {
    const res = await request(app)
      .put('/api/myapps/99999')
      .send({
        name: '更新不存在的应用',
      })
      .expect(404);

    expect(res.body.message).toBe('应用不存在');
  });

  it('ignores is_builtin field in update payload', async () => {
    const id = insertApp({
      name: '第三方应用',
      slug: 'third-party-2',
      isBuiltin: 0,
    });

    const res = await request(app)
      .put(`/api/myapps/${id}`)
      .send({
        name: '更新应用',
        is_builtin: true, // 应该被忽略
      })
      .expect(200);

    expect(res.body.code).toBe(200);
    const row = db.prepare('SELECT is_builtin FROM apps WHERE id = ?').get(id);
    // 应该仍然是 0（第三方应用）
    expect(row.is_builtin).toBe(0);
  });

  it('updates app with custom icon_filename', async () => {
    const id = insertApp({
      name: '测试应用',
      slug: 'test-app-icon',
      targetUrl: 'https://example.com',
    });

    const res = await request(app)
      .put(`/api/myapps/${id}`)
      .send({
        name: '更新应用',
        icon_filename: 'custom-icon.png', // 直接提供图标文件名
      })
      .expect(200);

    expect(res.body.code).toBe(200);
    const row = db
      .prepare('SELECT icon_filename FROM apps WHERE id = ?')
      .get(id);
    // 应该更新为新的图标文件名
    expect(row.icon_filename).toBe('custom-icon.png');
  });
});

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

function insertApp({ name, slug, isAutostart = 0 }) {
  const stmt = db.prepare(`
    INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_autostart, is_builtin, target_url)
    VALUES (?, ?, NULL, NULL, NULL, 1, ?, 0, NULL)
  `);
  const { lastInsertRowid } = stmt.run(name, slug, isAutostart ? 1 : 0);
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

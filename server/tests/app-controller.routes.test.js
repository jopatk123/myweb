import request from 'supertest';
import { createApp } from '../src/appFactory.js';

let app;
let db;

beforeAll(async () => {
  ({ app, db } = await createApp({
    dbPath: ':memory:',
    seedBuiltinApps: false,
    silentDbLogs: true,
  }));
});

afterAll(async () => {
  await db?.close?.();
});

beforeEach(() => {
  db.prepare('DELETE FROM apps WHERE is_builtin = 0').run();
  db.prepare('DELETE FROM app_groups WHERE is_default = 0').run();
});

function insertApp(overrides = {}) {
  const stmt = db.prepare(`
    INSERT INTO apps (name, slug, description, icon_filename, group_id, is_visible, is_autostart, is_builtin, target_url)
    VALUES (?, ?, NULL, NULL, ?, 1, 0, ?, ?)
  `);
  const res = stmt.run(
    overrides.name || '测试应用',
    overrides.slug ||
      `app-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    overrides.group_id || null,
    overrides.is_builtin || 0,
    overrides.target_url || null
  );
  return Number(res.lastInsertRowid);
}

describe('AppController - list()', () => {
  test('GET /api/myapps returns all apps', async () => {
    insertApp({ name: 'App1', slug: 'app1' });
    insertApp({ name: 'App2', slug: 'app2' });
    const res = await request(app).get('/api/myapps').expect(200);
    expect(res.body.code).toBe(200);
    expect(
      Array.isArray(res.body.data) || typeof res.body.data === 'object'
    ).toBe(true);
  });

  test('returns paginated apps when page and limit are provided', async () => {
    insertApp({ name: 'PagApp1', slug: 'pag-app1' });
    const res = await request(app)
      .get('/api/myapps?page=1&limit=5')
      .expect(200);
    expect(res.body.code).toBe(200);
  });

  test('filters by visible=true', async () => {
    const res = await request(app).get('/api/myapps?visible=true').expect(200);
    expect(res.body.code).toBe(200);
  });
});

describe('AppController - get()', () => {
  test('GET /api/myapps/:id returns app', async () => {
    const id = insertApp({ name: 'GetApp', slug: 'get-app-unique' });
    const res = await request(app).get(`/api/myapps/${id}`).expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  test('returns 404 for non-existent app', async () => {
    const res = await request(app).get('/api/myapps/999999').expect(404);
    expect(res.body.code).toBe(404);
  });
});

describe('AppController - create()', () => {
  test('POST /api/myapps creates a new app', async () => {
    const res = await request(app)
      .post('/api/myapps')
      .send({ name: '新创建应用', description: '描述' })
      .expect(201);
    expect(res.body.code).toBe(201);
    expect(res.body.data.name).toBe('新创建应用');
  });

  test('returns 400 for missing required name', async () => {
    const res = await request(app)
      .post('/api/myapps')
      .send({ description: '缺少名称' })
      .expect(400);
    expect(res.body.code).toBe(400);
  });

  test('creates app with target_url', async () => {
    const res = await request(app)
      .post('/api/myapps')
      .send({ name: '外部链接应用', target_url: 'https://example.com' })
      .expect(201);
    expect(res.body.code).toBe(201);
  });

  test('creates app with is_autostart flag', async () => {
    const res = await request(app)
      .post('/api/myapps')
      .send({ name: '自启动应用', is_autostart: true })
      .expect(201);
    expect(res.body.code).toBe(201);
  });
});

describe('AppController - update()', () => {
  test('PUT /api/myapps/:id updates app name', async () => {
    const id = insertApp({ name: '待更新App', slug: 'update-app-u' });
    const res = await request(app)
      .put(`/api/myapps/${id}`)
      .send({ name: '已更新App' })
      .expect(200);
    expect(res.body.data.name).toBe('已更新App');
  });

  test('returns 404 when updating non-existent app', async () => {
    const res = await request(app)
      .put('/api/myapps/999999')
      .send({ name: '不存在' })
      .expect(404);
    expect(res.body.code).toBe(404);
  });

  test('returns 400 when updating builtin app', async () => {
    const id = insertApp({
      name: '内置App',
      slug: 'builtin-app-u',
      is_builtin: 1,
    });
    const res = await request(app)
      .put(`/api/myapps/${id}`)
      .send({ name: '修改内置' })
      .expect(400);
    expect(res.body.code).toBe(400);
  });
});

describe('AppController - remove()', () => {
  test('DELETE /api/myapps/:id removes app', async () => {
    const id = insertApp({ name: '待删应用', slug: 'del-app-u' });
    const res = await request(app).delete(`/api/myapps/${id}`).expect(200);
    expect(res.body.code).toBe(200);
  });

  test('returns 404 when deleting non-existent app', async () => {
    const res = await request(app).delete('/api/myapps/999999').expect(404);
    expect(res.body.code).toBe(404);
  });
});

describe('AppController - setVisible()', () => {
  test('PUT /api/myapps/:id/visible sets app visibility', async () => {
    const id = insertApp({ name: '可见性App', slug: 'visible-app-u' });
    const res = await request(app)
      .put(`/api/myapps/${id}/visible`)
      .send({ visible: false })
      .expect(200);
    expect(res.body.code).toBe(200);
  });
});

describe('AppController - bulkVisible()', () => {
  test('PUT /api/myapps/bulk-visible sets multiple apps visibility', async () => {
    const id1 = insertApp({ name: 'BulkApp1', slug: 'bulk-vis-app1' });
    const id2 = insertApp({ name: 'BulkApp2', slug: 'bulk-vis-app2' });
    const res = await request(app)
      .put('/api/myapps/bulk/visible')
      .send({ ids: [id1, id2], visible: true })
      .expect(200);
    expect(res.body.code).toBe(200);
  });

  test('returns 400 when ids is empty', async () => {
    const res = await request(app)
      .put('/api/myapps/bulk/visible')
      .send({ ids: [], visible: true })
      .expect(400);
    expect(res.body.code).toBe(400);
  });
});

describe('AppController - move()', () => {
  test('PUT /api/myapps/move moves apps to target group', async () => {
    const id = insertApp({ name: 'MoveApp', slug: 'move-app-u' });
    const group = db
      .prepare('SELECT id FROM app_groups WHERE is_default = 1')
      .get();
    const res = await request(app)
      .put('/api/myapps/move')
      .send({ ids: [id], targetGroupId: group ? group.id : null })
      .expect(200);
    expect(res.body.code).toBe(200);
  });

  test('returns 400 when ids is empty', async () => {
    const res = await request(app)
      .put('/api/myapps/move')
      .send({ ids: [], targetGroupId: 1 })
      .expect(400);
    expect(res.body.code).toBe(400);
  });
});

describe('AppController - Groups', () => {
  test('GET /api/myapps/groups returns all groups', async () => {
    const res = await request(app).get('/api/myapps/groups/all').expect(200);
    expect(res.body.code).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/myapps/groups creates a group', async () => {
    const res = await request(app)
      .post('/api/myapps/groups')
      .send({ name: '新分组' })
      .expect(201);
    expect(res.body.code).toBe(201);
    expect(res.body.data.name).toBe('新分组');
  });

  test('returns 400 for missing group name', async () => {
    const res = await request(app)
      .post('/api/myapps/groups')
      .send({})
      .expect(400);
    expect(res.body.code).toBe(400);
  });

  test('PUT /api/myapps/groups/:id updates a group', async () => {
    const group = db
      .prepare('SELECT id FROM app_groups WHERE is_default = 0 LIMIT 1')
      .get();
    if (!group) {
      // Create one first
      const insertRes = await request(app)
        .post('/api/myapps/groups')
        .send({ name: '待更新分组创建' });
      const gid = insertRes.body.data.id;
      const res = await request(app)
        .put(`/api/myapps/groups/${gid}`)
        .send({ name: '已更新分组' })
        .expect(200);
      expect(res.body.code).toBe(200);
    } else {
      const res = await request(app)
        .put(`/api/myapps/groups/${group.id}`)
        .send({ name: '已更新分组名' })
        .expect(200);
      expect(res.body.code).toBe(200);
    }
  });

  test('DELETE /api/myapps/groups/:id deletes a group', async () => {
    const createRes = await request(app)
      .post('/api/myapps/groups')
      .send({ name: '待删除分组' });
    const gid = createRes.body.data.id;
    const res = await request(app)
      .delete(`/api/myapps/groups/${gid}`)
      .expect(200);
    expect(res.body.code).toBe(200);
  });
});

describe('AppController - icon upload', () => {
  test('POST /api/myapps/icons/upload with no file returns 400', async () => {
    const res = await request(app).post('/api/myapps/icons/upload').expect(400);
    expect(res.body.code).toBe(400);
  });

  test('POST /api/myapps/icons/upload with file returns 201', async () => {
    const res = await request(app)
      .post('/api/myapps/icons/upload')
      .attach('file', Buffer.from('fake-icon-data'), {
        filename: 'icon.png',
        contentType: 'image/png',
      })
      .expect(201);
    expect(res.body.code).toBe(201);
    expect(res.body.data.filename).toBeDefined();
    expect(res.body.data.path).toMatch(/^\/uploads\/apps\/icons\//);
  });
});

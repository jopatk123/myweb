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
  db.prepare('DELETE FROM notebook_notes').run();
});

function insertNote({
  title,
  description = '',
  category = '',
  priority = 'medium',
  completed = 0,
} = {}) {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO notebook_notes (title, description, category, priority, completed)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(title, description, category, priority, completed);
  return Number(lastInsertRowid);
}

describe('Notebook routes', () => {
  describe('POST /api/notebook', () => {
    it('creates a note and returns 201 envelope', async () => {
      const res = await request(app)
        .post('/api/notebook')
        .send({ title: '新笔记', description: '说明', priority: 'high' })
        .expect(201);

      expect(res.body).toMatchObject({
        code: 201,
        message: '创建成功',
      });
      expect(res.body.data).toMatchObject({
        id: expect.any(Number),
        title: '新笔记',
        description: '说明',
        priority: 'high',
        completed: 0,
      });
    });

    it('rejects payload without title with 400', async () => {
      const res = await request(app)
        .post('/api/notebook')
        .send({ description: '没有标题' })
        .expect(400);
      expect(res.body.code).toBe(400);
    });
  });

  describe('GET /api/notebook', () => {
    it('lists notes with pagination envelope', async () => {
      insertNote({ title: '笔记一' });
      insertNote({ title: '笔记二' });

      const res = await request(app).get('/api/notebook').expect(200);

      expect(res.body).toMatchObject({ code: 200, message: '获取成功' });
      expect(res.body.data).toMatchObject({
        items: expect.any(Array),
        total: 2,
        page: 1,
        limit: 50,
      });
      expect(res.body.data.items).toHaveLength(2);
    });

    it('honors pagination params and clamps oversized limit to 200', async () => {
      for (let i = 0; i < 3; i += 1) {
        insertNote({ title: `笔记${i}` });
      }

      const paged = await request(app)
        .get('/api/notebook?page=2&limit=2')
        .expect(200);
      expect(paged.body.data).toMatchObject({ total: 3, page: 2, limit: 2 });
      expect(paged.body.data.items).toHaveLength(1);

      const clamped = await request(app)
        .get('/api/notebook?limit=5000')
        .expect(200);
      expect(clamped.body.data.limit).toBe(200);
    });

    it('filters by status, category and search', async () => {
      insertNote({ title: '工作事项', category: 'work' });
      insertNote({ title: '生活事项', category: 'life' });
      insertNote({
        title: '已完成工作',
        category: 'work',
        completed: 1,
      });

      const completed = await request(app)
        .get('/api/notebook?status=completed')
        .expect(200);
      expect(completed.body.data.total).toBe(1);
      expect(completed.body.data.items[0].title).toBe('已完成工作');

      const work = await request(app)
        .get('/api/notebook?category=work')
        .expect(200);
      expect(work.body.data.total).toBe(2);

      const searched = await request(app)
        .get(`/api/notebook?search=${encodeURIComponent('生活')}`)
        .expect(200);
      expect(searched.body.data.total).toBe(1);
      expect(searched.body.data.items[0].title).toBe('生活事项');
    });
  });

  describe('GET /api/notebook/:id', () => {
    it('returns a single note', async () => {
      const id = insertNote({ title: '单条笔记' });

      const res = await request(app).get(`/api/notebook/${id}`).expect(200);
      expect(res.body.data).toMatchObject({ id, title: '单条笔记' });
    });

    it('returns 404 for missing note', async () => {
      await request(app).get('/api/notebook/999999').expect(404);
    });
  });

  describe('PUT /api/notebook/:id', () => {
    it('partially updates a note', async () => {
      const id = insertNote({ title: '待更新' });

      const res = await request(app)
        .put(`/api/notebook/${id}`)
        .send({ completed: true })
        .expect(200);

      expect(res.body).toMatchObject({ code: 200, message: '更新成功' });
      expect(res.body.data).toMatchObject({ id, completed: 1 });
    });

    it('returns 404 when updating a missing note', async () => {
      const res = await request(app)
        .put('/api/notebook/999999')
        .send({ title: '不存在的笔记' })
        .expect(404);
      expect(res.body.message).toBe('笔记不存在');
    });
  });

  describe('DELETE /api/notebook/:id', () => {
    it('deletes an existing note', async () => {
      const id = insertNote({ title: '待删除' });

      await request(app).delete(`/api/notebook/${id}`).expect(200);
      const row = db
        .prepare('SELECT id FROM notebook_notes WHERE id = ?')
        .get(id);
      expect(row).toBeUndefined();
    });

    it('is idempotent for missing notes', async () => {
      await request(app).delete('/api/notebook/999999').expect(200);
    });
  });
});

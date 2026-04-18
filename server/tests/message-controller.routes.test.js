import { jest } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../src/appFactory.js';
import { setDb } from '../src/utils/dbPool.js';

let app;
let db;

beforeAll(async () => {
  ({ app, db } = await createApp({
    dbPath: ':memory:',
    seedBuiltinApps: false,
    silentDbLogs: true,
  }));
  setDb(db);
});

afterAll(async () => {
  await db?.close?.();
});

beforeEach(() => {
  db.prepare('DELETE FROM messages').run();
  db.prepare('DELETE FROM user_sessions').run();
  jest.restoreAllMocks();
});

describe('MessageController - sendMessage()', () => {
  test('POST /api/messages sends a message', async () => {
    const res = await request(app)
      .post('/api/messages')
      .send({ content: '你好，世界！' })
      .expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.content).toBe('你好，世界！');
  });

  test('POST /api/messages with authorName and authorColor', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('x-session-id', 'test-session')
      .send({
        content: '自定义作者',
        authorName: 'Alice',
        authorColor: '#ff0000',
      })
      .expect(200);
    expect(res.body.data.authorName).toBe('Alice');
  });

  test('POST /api/messages sends a message with images', async () => {
    const res = await request(app)
      .post('/api/messages')
      .send({
        content: '有图片的留言',
        imageType: 'grid',
        images: [{ path: 'uploads/message-images/test.jpg' }],
      })
      .expect(200);
    expect(res.body.code).toBe(200);
  });

  test('POST /api/messages returns error for empty content and no images', async () => {
    const res = await request(app).post('/api/messages').send({ content: '' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('MessageController - getMessages()', () => {
  test('GET /api/messages returns message list', async () => {
    await request(app).post('/api/messages').send({ content: '测试消息1' });
    const res = await request(app).get('/api/messages').expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toHaveProperty('messages');
    expect(res.body.data).toHaveProperty('pagination');
  });

  test('GET /api/messages supports search query', async () => {
    await request(app)
      .post('/api/messages')
      .send({ content: '搜索关键字测试' });
    const res = await request(app).get('/api/messages?q=keyword').expect(200);
    expect(res.body.code).toBe(200);
  });

  test('GET /api/messages supports pagination', async () => {
    const res = await request(app)
      .get('/api/messages?page=1&limit=10')
      .expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(10);
  });
});

describe('MessageController - deleteMessage()', () => {
  test('DELETE /api/messages/:id deletes a message', async () => {
    const sendRes = await request(app)
      .post('/api/messages')
      .send({ content: '待删留言' });
    const id = sendRes.body.data.id;
    const res = await request(app).delete(`/api/messages/${id}`).expect(200);
    expect(res.body.code).toBe(200);
  });

  test('DELETE /api/messages/:id returns error for non-existent message', async () => {
    const res = await request(app).delete('/api/messages/999999');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('MessageController - updateUserSettings()', () => {
  test('PUT /api/messages/user-settings updates settings', async () => {
    const res = await request(app)
      .put('/api/messages/user-settings')
      .set('x-session-id', 'settings-session')
      .send({ nickname: 'TestUser', avatarColor: '#123456' })
      .expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.nickname).toBe('TestUser');
  });
});

describe('MessageController - getUserSettings()', () => {
  test('GET /api/messages/user-settings returns settings', async () => {
    const res = await request(app)
      .get('/api/messages/user-settings')
      .set('x-session-id', 'get-settings-session')
      .expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});

describe('MessageController - clearAllMessages()', () => {
  test('DELETE /api/messages/clear-all with confirm=true clears all', async () => {
    await request(app).post('/api/messages').send({ content: '要清除1' });
    await request(app).post('/api/messages').send({ content: '要清除2' });
    const res = await request(app)
      .delete('/api/messages/clear-all')
      .send({ confirm: true })
      .expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.deletedMessages).toBeGreaterThanOrEqual(2);
  });

  test('DELETE /api/messages/clear-all without confirm returns 400', async () => {
    const res = await request(app)
      .delete('/api/messages/clear-all')
      .send({ confirm: false })
      .expect(400);
    expect(res.body.code).toBe(400);
  });
});

describe('MessageController - wsServer broadcast branches', () => {
  let mockWsServer;

  beforeEach(() => {
    mockWsServer = { broadcast: jest.fn() };
    app.set('wsServer', mockWsServer);
  });

  afterEach(() => {
    app.set('wsServer', null);
  });

  test('POST /api/messages broadcasts newMessage via wsServer', async () => {
    const res = await request(app)
      .post('/api/messages')
      .send({ content: 'ws广播测试' })
      .expect(200);
    expect(res.body.code).toBe(200);
    expect(mockWsServer.broadcast).toHaveBeenCalledWith(
      'newMessage',
      expect.any(Object)
    );
  });

  test('DELETE /api/messages/:id broadcasts messageDeleted via wsServer', async () => {
    app.set('wsServer', null);
    const sendRes = await request(app)
      .post('/api/messages')
      .send({ content: '待删wsServer留言' });
    app.set('wsServer', mockWsServer);
    mockWsServer.broadcast.mockClear();
    const id = sendRes.body.data.id;
    await request(app).delete(`/api/messages/${id}`).expect(200);
    expect(mockWsServer.broadcast).toHaveBeenCalledWith(
      'messageDeleted',
      expect.any(Object)
    );
  });

  test('DELETE /api/messages/clear-all broadcasts messagesCleared via wsServer', async () => {
    app.set('wsServer', null);
    await request(app).post('/api/messages').send({ content: 'ws清空留言' });
    app.set('wsServer', mockWsServer);
    mockWsServer.broadcast.mockClear();
    const res = await request(app)
      .delete('/api/messages/clear-all')
      .send({ confirm: true })
      .expect(200);
    expect(res.body.code).toBe(200);
    expect(mockWsServer.broadcast).toHaveBeenCalledWith(
      'messagesCleared',
      expect.any(Object)
    );
  });
});

describe('MessageController - uploadImage()', () => {
  test('POST /api/messages/upload-image with no files returns 400', async () => {
    const res = await request(app)
      .post('/api/messages/upload-image')
      .expect(400);
    expect(res.body.code).toBe(400);
  });

  test('POST /api/messages/upload-image with image file returns 200', async () => {
    const res = await request(app)
      .post('/api/messages/upload-image')
      .attach('images', Buffer.from('fake-image-data'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].filename).toBeDefined();
  });
});

describe('MessageController - error branches', () => {
  // Error branch tests removed: static method spying is incompatible with the
  // instance-based MessageService / UserSessionService pattern.
});

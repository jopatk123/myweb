import { jest } from '@jest/globals';
import { createTestDatabase, closeTestDatabase } from '../helpers/test-db.js';
import { NotebookNoteController } from '../../src/controllers/notebook-note.controller.js';

describe('NotebookNoteController', () => {
  let db;
  let controller;
  let req;
  let res;
  let next;

  beforeAll(async () => {
    db = await createTestDatabase();
    controller = new NotebookNoteController(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    db.prepare('DELETE FROM notebook_notes').run();
    req = { body: {}, query: {}, params: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('list()', () => {
    test('returns all notes with default pagination', async () => {
      await controller.list(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });

    test('returns notes with custom pagination', async () => {
      req.query = { page: '2', limit: '10', search: 'test' };
      await controller.list(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });

    test('returns notes filtered by status', async () => {
      req.query = { status: 'completed' };
      await controller.list(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });

    test('returns notes filtered by category', async () => {
      req.query = { category: 'work' };
      await controller.list(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });

    test('calls next on error', async () => {
      jest.spyOn(controller.service, 'list').mockImplementation(() => {
        throw new Error('service error');
      });
      await controller.list(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('get()', () => {
    test('returns note by id', async () => {
      const row = controller.service.create({ title: '测试笔记' });
      req.params = { id: String(row.id) };
      await controller.get(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });

    test('calls next when note not found', async () => {
      req.params = { id: '999999' };
      await controller.get(req, res, next);
      // Service throws on not found
      expect(next).toHaveBeenCalled();
    });

    test('calls next on unexpected error', async () => {
      jest.spyOn(controller.service, 'get').mockImplementation(() => {
        throw new Error('get error');
      });
      req.params = { id: '1' };
      await controller.get(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('create()', () => {
    test('creates a note with valid payload', async () => {
      req.body = { title: '新笔记', description: '描述内容' };
      await controller.create(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 201 })
      );
    });

    test('creates a note with all fields', async () => {
      req.body = {
        title: '完整笔记',
        description: '详细描述',
        category: '工作',
        priority: 'high',
        completed: false,
      };
      await controller.create(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('calls next on validation error (missing title)', async () => {
      req.body = { description: '没有标题' };
      await controller.create(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('calls next on invalid priority value', async () => {
      req.body = { title: '测试', priority: 'invalid' };
      await controller.create(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    test('updates a note', async () => {
      const row = controller.service.create({ title: '待更新' });
      req.params = { id: String(row.id) };
      req.body = { title: '已更新', completed: true };
      await controller.update(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });

    test('returns response when note does not exist (update silently proceeds)', async () => {
      req.params = { id: '999999' };
      req.body = { title: '不存在的笔记' };
      await controller.update(req, res, next);
      // service.update returns undefined for non-existent id (no throw)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });

    test('calls next on invalid priority during update', async () => {
      const row = controller.service.create({ title: '优先级错误' });
      req.params = { id: String(row.id) };
      req.body = { priority: 'wrong' };
      await controller.update(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    test('allows update without title (title is optional for updates)', async () => {
      const row = controller.service.create({ title: '可选标题更新' });
      req.params = { id: String(row.id) };
      req.body = { description: '更新描述' };
      await controller.update(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });
  });

  describe('remove()', () => {
    test('removes an existing note', async () => {
      const row = controller.service.create({ title: '待删除笔记' });
      req.params = { id: String(row.id) };
      await controller.remove(req, res, next);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });

    test('returns success even when note does not exist (delete silently proceeds)', async () => {
      req.params = { id: '999999' };
      await controller.remove(req, res, next);
      // service.remove runs DELETE without throwing on non-existent id
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 })
      );
    });

    test('calls next on unexpected error', async () => {
      jest.spyOn(controller.service, 'remove').mockImplementation(() => {
        throw new Error('remove error');
      });
      req.params = { id: '1' };
      await controller.remove(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

/* eslint-env jest */
import { NotebookNoteService } from '../src/services/notebook-note.service.js';
import { createTestDatabase, closeTestDatabase } from './helpers/test-db.js';

describe('NotebookNoteService database integration', () => {
  let db;
  let service;

  beforeAll(async () => {
    db = await createTestDatabase();
    service = new NotebookNoteService(db);
  });

  afterAll(() => {
    closeTestDatabase(db);
  });

  beforeEach(() => {
    db.prepare('DELETE FROM notebook_notes').run();
  });

  test('create persists note with defaults and returns db row', () => {
    const created = service.create({
      title: '写周报',
      description: '总结本周工作',
      category: 'work',
      priority: 'high',
      completed: true,
    });

    expect(created).toMatchObject({
      title: '写周报',
      description: '总结本周工作',
      category: 'work',
      priority: 'high',
    });
    expect(created.completed).toBe(1);
    expect(created.id).toBeGreaterThan(0);
    expect(created.created_at).toBeTruthy();
    expect(created.updated_at).toBeTruthy();
  });

  test('get throws 404 error when note does not exist', () => {
    try {
      service.get(9999);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('笔记不存在');
      expect(error.status).toBe(404);
    }
    expect(() => service.get(9999)).toThrow('笔记不存在');
  });

  test('list supports filtering by status, category and search', () => {
    const records = [
      { title: '学习计划', description: '阅读一本书', category: 'life' },
      {
        title: '完成代码审查',
        description: 'review feature PR',
        category: 'work',
        completed: true,
      },
      { title: '准备演讲', description: 'tech talk', category: 'work' },
    ];

    for (const payload of records) {
      service.create(payload);
    }

    const completed = service.list({ status: 'completed' });
    expect(completed.total).toBe(1);
    expect(completed.items.map(item => item.title)).toEqual(['完成代码审查']);

    const workCategory = service.list({ category: 'work' });
    expect(workCategory.total).toBe(2);
    expect(workCategory.items.every(item => item.category === 'work')).toBe(
      true
    );

    const searched = service.list({ search: '阅读' });
    expect(searched.total).toBe(1);
    expect(searched.items[0].title).toBe('学习计划');
  });

  test('update toggles completion state and refreshes updated_at', () => {
    const created = service.create({
      title: '撰写测试用例',
      description: '',
      category: 'work',
    });

    const originalUpdatedAt = created.updated_at;

    const updated = service.update(created.id, {
      title: '完成测试用例',
      completed: true,
      priority: 'low',
    });

    expect(updated.title).toBe('完成测试用例');
    expect(updated.completed).toBe(1);
    expect(updated.priority).toBe('low');
    expect(updated.updated_at).toBeTruthy();
    expect(updated.updated_at >= originalUpdatedAt).toBe(true);
  });

  test('remove deletes record and returns deletion result', () => {
    const created = service.create({ title: '临时笔记' });

    const result = service.remove(created.id);
    expect(result.changes).toBe(1);

    const list = service.list();
    expect(list.total).toBe(0);
  });
});

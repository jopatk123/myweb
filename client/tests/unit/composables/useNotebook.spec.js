import { beforeEach, describe, expect, it, vi } from 'vitest';

const notebookApiMock = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

vi.mock('@/api/notebook.js', () => ({
  notebookApi: notebookApiMock,
}));

vi.mock('@/utils/idGenerator.js', () => ({
  generateId: vi.fn(() => 'local-note-id'),
}));

describe('useNotebook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(key => (store.has(key) ? store.get(key) : null)),
      setItem: vi.fn((key, value) => {
        store.set(key, String(value));
      }),
      removeItem: vi.fn(key => {
        store.delete(key);
      }),
      clear: vi.fn(() => {
        store.clear();
      }),
    });
  });

  async function createState() {
    vi.resetModules();
    const { useNotebook } = await import('@/composables/useNotebook.js');
    return useNotebook();
  }

  it('loads notes via notebookApi.list and unwraps nested data', async () => {
    notebookApiMock.list.mockResolvedValue({
      code: 200,
      data: {
        items: [
          {
            id: 1,
            title: '服务端笔记',
            description: 'desc',
            completed: 1,
            priority: 'high',
            created_at: '2025-06-01T10:00:00Z',
            updated_at: '2025-06-02T10:00:00Z',
          },
        ],
        total: 1,
      },
      message: 'ok',
    });

    const state = await createState();
    await state.initializeData();

    expect(notebookApiMock.list).toHaveBeenCalledTimes(1);
    expect(state.notes.value).toHaveLength(1);
    expect(state.notes.value[0]).toMatchObject({
      id: 1,
      title: '服务端笔记',
      completed: true,
      createdAt: '2025-06-01T10:00:00Z',
      updatedAt: '2025-06-02T10:00:00Z',
    });
    expect(state.serverReady.value).toBe(true);
  });

  it('creates note with current API contract and clears category', async () => {
    notebookApiMock.create.mockResolvedValue({
      code: 201,
      data: {
        id: 9,
        title: '新笔记',
        description: '说明',
        category: '',
        priority: 'medium',
        completed: 0,
        created_at: '2025-06-01T10:00:00Z',
        updated_at: '2025-06-01T10:00:00Z',
      },
    });

    const state = await createState();
    await state.saveNote({
      title: '新笔记',
      description: '说明',
      priority: 'medium',
    });

    expect(notebookApiMock.create).toHaveBeenCalledWith({
      title: '新笔记',
      description: '说明',
      priority: 'medium',
      category: '',
      completed: false,
    });
    expect(state.notes.value[0].id).toBe(9);
  });

  it('falls back to local storage when loading fails', async () => {
    localStorage.setItem(
      'notebook-notes',
      JSON.stringify([
        {
          id: 'offline-1',
          title: '离线笔记',
          description: '',
          completed: false,
          priority: 'low',
          createdAt: '2025-06-01T10:00:00Z',
          updatedAt: '2025-06-01T10:00:00Z',
        },
      ])
    );
    notebookApiMock.list.mockRejectedValue(new Error('network down'));

    const state = await createState();
    await state.initializeData();

    expect(state.serverReady.value).toBe(false);
    expect(state.error.value).toBe('服务器暂不可用，已切换到本地笔记');
    expect(state.notes.value[0].title).toBe('离线笔记');
  });

  it('falls back to local note creation when create request fails', async () => {
    notebookApiMock.create.mockRejectedValue(new Error('timeout'));

    const state = await createState();
    await state.saveNote({
      title: '本地新建',
      description: '离线保存',
      priority: 'high',
    });

    expect(state.serverReady.value).toBe(false);
    expect(state.error.value).toBe('保存失败，已切换到本地模式');
    expect(state.notes.value[0]).toMatchObject({
      id: 'local-note-id',
      title: '本地新建',
      description: '离线保存',
      priority: 'high',
      completed: false,
    });
  });

  it('parses quick add syntax into title, description and priority', async () => {
    notebookApiMock.create.mockResolvedValue({
      code: 201,
      data: {
        id: 11,
        title: '马上处理',
        description: '记得回电话',
        priority: 'high',
        completed: 0,
        created_at: '2025-06-01T10:00:00Z',
        updated_at: '2025-06-01T10:00:00Z',
      },
    });

    const state = await createState();
    const ok = await state.quickAddNote('!马上处理 //记得回电话');

    expect(ok).toBe(true);
    expect(notebookApiMock.create).toHaveBeenCalledWith({
      title: '马上处理',
      description: '记得回电话',
      priority: 'high',
      category: '',
      completed: false,
    });
  });
});

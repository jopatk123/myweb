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

  const makeNote = id => ({
    id,
    title: `笔记${id}`,
    description: '',
    category: '',
    completed: false,
    priority: 'medium',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
  });

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

    expect(notebookApiMock.list).toHaveBeenCalledWith({
      page: 1,
      limit: 200,
    });
    expect(state.notes.value).toHaveLength(1);
    expect(state.notes.value[0]).toMatchObject({
      id: 1,
      title: '服务端笔记',
      completed: true,
      createdAt: '2025-06-01T10:00:00.000Z',
      updatedAt: '2025-06-02T10:00:00.000Z',
    });
    expect(state.serverReady.value).toBe(true);
  });

  it('fetches additional pages until the server total is exhausted', async () => {
    const firstPage = Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      title: `笔记${i + 1}`,
      completed: 0,
      created_at: '2025-06-01 10:00:00',
      updated_at: '2025-06-01 10:00:00',
    }));
    const secondPage = [
      {
        id: 201,
        title: '第201条',
        completed: 0,
        created_at: '2025-05-01 10:00:00',
        updated_at: '2025-05-01 10:00:00',
      },
    ];

    notebookApiMock.list
      .mockResolvedValueOnce({
        code: 200,
        data: { items: firstPage, total: 201, page: 1, limit: 200 },
      })
      .mockResolvedValueOnce({
        code: 200,
        data: { items: secondPage, total: 201, page: 2, limit: 200 },
      });

    const state = await createState();
    await state.initializeData();

    expect(notebookApiMock.list).toHaveBeenCalledTimes(2);
    expect(notebookApiMock.list).toHaveBeenLastCalledWith({
      page: 2,
      limit: 200,
    });
    expect(state.notes.value).toHaveLength(201);
  });

  it('normalizes SQLite timestamps into UTC ISO strings', async () => {
    notebookApiMock.list.mockResolvedValue({
      code: 200,
      data: {
        items: [
          {
            id: 1,
            title: '时间戳笔记',
            completed: 0,
            created_at: '2025-06-01 10:00:00',
            updated_at: '2025-06-02 08:30:00',
          },
        ],
        total: 1,
      },
    });

    const state = await createState();
    await state.initializeData();

    expect(state.notes.value[0].createdAt).toBe('2025-06-01T10:00:00.000Z');
    expect(state.notes.value[0].updatedAt).toBe('2025-06-02T08:30:00.000Z');
  });

  it('keeps offline-created local notes after the server data loads', async () => {
    localStorage.setItem(
      'notebook-notes',
      JSON.stringify([
        {
          id: 'offline-1',
          title: '离线新增',
          description: '',
          category: '',
          completed: false,
          priority: 'medium',
          createdAt: '2025-06-03T10:00:00Z',
          updatedAt: '2025-06-03T10:00:00Z',
        },
        {
          id: 1,
          title: '服务端旧版',
          description: '',
          completed: false,
          priority: 'low',
          createdAt: '2025-06-01T10:00:00Z',
          updatedAt: '2025-06-01T10:00:00Z',
        },
      ])
    );
    notebookApiMock.list.mockResolvedValue({
      code: 200,
      data: {
        items: [
          {
            id: 1,
            title: '服务端新版',
            completed: 0,
            priority: 'low',
            created_at: '2025-06-01 10:00:00',
            updated_at: '2025-06-01 10:00:00',
          },
        ],
        total: 1,
      },
    });

    const state = await createState();
    await state.initializeData();

    expect(state.serverReady.value).toBe(true);
    // 离线新增的笔记被保留，而不是被服务器数据覆盖丢弃
    expect(state.notes.value.map(note => note.title)).toEqual([
      '离线新增',
      '服务端新版',
    ]);
  });

  it('prefers the local mirror edit when it is newer than the server row', async () => {
    localStorage.setItem(
      'notebook-notes',
      JSON.stringify([
        {
          id: 1,
          title: '离线编辑后的标题',
          description: '',
          completed: false,
          priority: 'medium',
          createdAt: '2025-06-01T10:00:00Z',
          updatedAt: '2025-06-05T10:00:00Z',
        },
      ])
    );
    notebookApiMock.list.mockResolvedValue({
      code: 200,
      data: {
        items: [
          {
            id: 1,
            title: '服务端旧标题',
            completed: 0,
            created_at: '2025-06-01 10:00:00',
            updated_at: '2025-06-01 10:00:00',
          },
        ],
        total: 1,
      },
    });

    const state = await createState();
    await state.initializeData();

    expect(state.notes.value[0].title).toBe('离线编辑后的标题');
  });

  it('creates note with current API contract and passes category through', async () => {
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

  it('keeps server mode on API validation errors and avoids local divergence', async () => {
    const apiError = new Error('标题不能为空');
    apiError.name = 'ApiError';
    apiError.payload = { code: 400, message: '标题不能为空' };
    notebookApiMock.create.mockRejectedValue(apiError);

    const state = await createState();
    const saved = await state.saveNote({
      title: '',
      description: '无效请求',
      priority: 'medium',
    });

    expect(saved).toBe(false);
    expect(state.serverReady.value).toBe(true);
    expect(state.error.value).toBe('标题不能为空');
    expect(state.notes.value).toEqual([]);
  });

  it('returns false from quickAddNote when the server rejects the payload', async () => {
    const apiError = new Error('标题不能为空');
    apiError.name = 'ApiError';
    apiError.payload = { code: 400, message: '标题不能为空' };
    notebookApiMock.create.mockRejectedValue(apiError);

    const state = await createState();
    const ok = await state.quickAddNote('   !   ');

    expect(ok).toBe(false);
    expect(state.serverReady.value).toBe(true);
    expect(state.error.value).toBe('标题不能为空');
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

  it('deleteNote removes server notes and keeps local deletion on network failure', async () => {
    notebookApiMock.remove.mockResolvedValueOnce({ code: 200 });

    const state = await createState();
    state.notes.value = [makeNote(1), makeNote(2)];

    await expect(state.deleteNote(2)).resolves.toBe(true);
    expect(state.notes.value.map(note => note.id)).toEqual([1]);

    // 网络异常时回退：退出服务端模式并继续删除本地
    notebookApiMock.remove.mockRejectedValueOnce(new Error('network down'));
    await expect(state.deleteNote(1)).resolves.toBe(true);
    expect(state.serverReady.value).toBe(false);
    expect(state.error.value).toBe('删除时网络异常，已同步本地结果');
    expect(state.notes.value).toEqual([]);
  });

  it('deleteNote reports API rejection and deletes string ids locally', async () => {
    const apiError = new Error('笔记不存在');
    apiError.name = 'ApiError';
    apiError.payload = { code: 404, message: '笔记不存在' };
    notebookApiMock.remove.mockRejectedValue(apiError);

    const state = await createState();
    state.notes.value = [makeNote('offline-1')];

    await expect(state.deleteNote(1)).resolves.toBe(false);
    expect(state.error.value).toBe('笔记不存在');

    // 字符串 id（离线笔记）不请求服务端，直接本地删除
    await expect(state.deleteNote('offline-1')).resolves.toBe(true);
    expect(notebookApiMock.remove).toHaveBeenCalledTimes(1);
    expect(state.notes.value).toEqual([]);
  });

  it('toggleNoteStatus syncs completion through the server API', async () => {
    notebookApiMock.update.mockResolvedValue({
      code: 200,
      data: {
        ...makeNote(3),
        completed: 1,
        updated_at: '2025-06-02T10:00:00Z',
      },
    });

    const state = await createState();
    state.notes.value = [makeNote(3)];

    await expect(state.toggleNoteStatus(3)).resolves.toBe(true);
    expect(notebookApiMock.update).toHaveBeenCalledWith(3, { completed: true });
    expect(state.notes.value[0].completed).toBe(true);
  });

  it('toggleNoteStatus ignores unknown ids and falls back locally on failure', async () => {
    const state = await createState();

    await expect(state.toggleNoteStatus(999)).resolves.toBeUndefined();
    expect(notebookApiMock.update).not.toHaveBeenCalled();

    state.notes.value = [makeNote(3)];
    notebookApiMock.update.mockRejectedValueOnce(new Error('network down'));
    await expect(state.toggleNoteStatus(3)).resolves.toBe(true);
    expect(state.serverReady.value).toBe(false);
    expect(state.notes.value[0].completed).toBe(true);
    expect(state.error.value).toBe('状态更新失败，已切换到本地模式');
  });

  it('saveNote updates an existing server note via notebookApi.update', async () => {
    notebookApiMock.update.mockResolvedValue({
      code: 200,
      data: { ...makeNote(5), title: '更新后的标题', completed: 1 },
    });

    const state = await createState();
    state.notes.value = [makeNote(5)];

    await expect(
      state.saveNote({ title: '更新后的标题' }, { id: 5, completed: false })
    ).resolves.toBe(true);
    expect(notebookApiMock.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ title: '更新后的标题', completed: false })
    );
    expect(state.notes.value[0].title).toBe('更新后的标题');
    expect(state.notes.value[0].completed).toBe(true);
  });

  it('loadNotes reports API rejections without falling back to local data', async () => {
    const apiError = new Error('鉴权失败');
    apiError.name = 'ApiError';
    apiError.payload = { code: 401, message: '鉴权失败' };
    notebookApiMock.list.mockRejectedValue(apiError);

    const state = await createState();
    await state.initializeData();
    expect(state.serverReady.value).toBe(true);
    expect(state.error.value).toBe('鉴权失败');
    expect(state.notes.value).toEqual([]);
  });

  it('tracks completion counts, display limit and rejects empty quick adds', async () => {
    const state = await createState();
    state.notes.value = [makeNote(1), { ...makeNote(2), completed: true }];

    expect(state.completedCount.value).toBe(1);
    expect(state.pendingCount.value).toBe(1);

    state.loadMoreNotes();
    expect(state.displayLimit.value).toBe(100);
    state.resetDisplayLimit();
    expect(state.displayLimit.value).toBe(50);

    await expect(state.quickAddNote('   ')).resolves.toBe(false);
    expect(notebookApiMock.create).not.toHaveBeenCalled();
  });
});

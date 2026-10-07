import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/vue';
import NotebookApp from '@/apps/notebook/NotebookApp.vue';
import { useGlobalToast } from '@/composables/useGlobalToast.js';

// vi.hoisted：让 mock 对象在 vi.mock 工厂执行（模块图解析阶段）前就可用
const notebookApiMock = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  bulkRemove: vi.fn(),
}));

vi.mock('@/api/notebook.js', () => ({
  notebookApi: notebookApiMock,
}));

// 固定为历史日期（UTC 正午），跨时区渲染结果稳定
const FIXED_DATE = '2025-06-01T12:00:00Z';

function serverNote(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    title: overrides.title ?? '笔记',
    description: overrides.description ?? '',
    category: overrides.category ?? '',
    completed: overrides.completed ? 1 : 0,
    priority: overrides.priority ?? 'medium',
    created_at: overrides.created_at ?? FIXED_DATE,
    updated_at: overrides.updated_at ?? FIXED_DATE,
  };
}

const okRow = row => ({ code: 200, data: row });
const listResponse = items => ({
  code: 200,
  data: { items, total: items.length, page: 1, limit: 200 },
});

function makeRowFromPayload(payload) {
  return serverNote({
    title: payload.title,
    description: payload.description,
    category: payload.category,
    priority: payload.priority,
    completed: payload.completed,
  });
}

async function mountApp(listItems = []) {
  notebookApiMock.list.mockResolvedValue(listResponse(listItems));
  const utils = render(NotebookApp);
  // 等待挂载后的 initializeData 完成
  await waitFor(() =>
    expect(notebookApiMock.list).toHaveBeenCalledWith({ page: 1, limit: 200 })
  );
  return utils;
}

describe('notebook/NotebookApp (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGlobalToast().hideToast();

    notebookApiMock.remove.mockResolvedValue(okRow(null));
    notebookApiMock.bulkRemove.mockResolvedValue(okRow(null));
    notebookApiMock.create.mockImplementation(payload =>
      Promise.resolve(okRow({ ...makeRowFromPayload(payload), id: 900 }))
    );
    notebookApiMock.update.mockImplementation((id, payload) =>
      Promise.resolve(okRow({ ...makeRowFromPayload(payload), id }))
    );
  });

  it('loads server notes and shows header stats', async () => {
    const { getByText, getAllByText, getByRole } = await mountApp([
      serverNote({ id: 1, title: '已完成笔记', completed: true }),
      serverNote({ id: 2, title: '待办笔记' }),
    ]);

    await waitFor(() => expect(getByText('已完成笔记')).toBeInTheDocument());
    expect(getByText('待办笔记')).toBeInTheDocument();
    expect(getByText('总计')).toBeInTheDocument();
    expect(getByText('2')).toBeInTheDocument();
    expect(getAllByText('1')).toHaveLength(2);
    expect(getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('quick-adds a note with ! priority and // description syntax', async () => {
    const { getByPlaceholderText, findByText } = await mountApp([]);

    const input = getByPlaceholderText(/快速添加/);
    await fireEvent.update(input, '!写周报 //整理数据');
    await fireEvent.keyUp(input, { key: 'Enter' });

    expect(notebookApiMock.create).toHaveBeenCalledWith({
      title: '写周报',
      description: '整理数据',
      priority: 'high',
      category: '',
      completed: false,
    });
    expect(await findByText('写周报')).toBeInTheDocument();
  });

  it('creates a note through the form and closes it', async () => {
    const { getByRole, getByLabelText, queryByLabelText, findByText } =
      await mountApp([]);

    await fireEvent.click(getByRole('button', { name: '新建' }));
    await fireEvent.update(getByLabelText('标题 *'), '表单新建的笔记');
    await fireEvent.update(getByLabelText('描述'), '来自表单');
    await fireEvent.click(getByRole('button', { name: '创建' }));

    expect(notebookApiMock.create).toHaveBeenCalledWith({
      title: '表单新建的笔记',
      description: '来自表单',
      category: '',
      priority: 'medium',
      completed: false,
    });
    expect(await findByText('表单新建的笔记')).toBeInTheDocument();
    expect(queryByLabelText('标题 *')).toBeNull();
  });

  it('edits an existing note via the form', async () => {
    const {
      getAllByRole,
      getByRole,
      getByLabelText,
      getByText,
      queryByLabelText,
    } = await mountApp([
      serverNote({ id: 1, title: '原标题', priority: 'low' }),
    ]);
    await waitFor(() => expect(getByText('原标题')).toBeInTheDocument());

    await fireEvent.click(getAllByRole('button', { name: '编辑' })[0]);
    expect(getByLabelText('标题 *').value).toBe('原标题');

    await fireEvent.update(getByLabelText('标题 *'), '改后的标题');
    await fireEvent.click(getByRole('button', { name: '更新' }));

    await waitFor(() =>
      expect(notebookApiMock.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: '改后的标题' })
      )
    );
    await waitFor(() => expect(queryByLabelText('标题 *')).toBeNull());
  });

  it('closes the edit form without saving on cancel', async () => {
    const { getAllByRole, getByRole, queryByLabelText, getByText } =
      await mountApp([serverNote({ id: 1, title: '原标题' })]);
    await waitFor(() => expect(getByText('原标题')).toBeInTheDocument());

    await fireEvent.click(getAllByRole('button', { name: '编辑' })[0]);
    await fireEvent.click(getByRole('button', { name: '取消' }));

    expect(queryByLabelText('标题 *')).toBeNull();
    expect(notebookApiMock.update).not.toHaveBeenCalled();
    expect(notebookApiMock.create).not.toHaveBeenCalled();
  });

  it('toggles note status through the status button', async () => {
    const { getByRole, findByRole } = await mountApp([
      serverNote({ id: 1, title: '笔记' }),
    ]);
    await waitFor(() =>
      expect(getByRole('button', { name: '标记为已完成' })).toBeInTheDocument()
    );

    await fireEvent.click(getByRole('button', { name: '标记为已完成' }));

    await waitFor(() =>
      expect(notebookApiMock.update).toHaveBeenCalledWith(1, {
        completed: true,
      })
    );
    expect(await findByRole('button', { name: '标记为待办' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('deletes a note and supports undo from the toast action', async () => {
    const { getAllByRole, queryByText, getByText } = await mountApp([
      serverNote({ id: 1, title: '要删的笔记' }),
    ]);
    await waitFor(() => expect(getByText('要删的笔记')).toBeInTheDocument());

    await fireEvent.click(getAllByRole('button', { name: '删除' })[0]);

    await waitFor(() => expect(notebookApiMock.remove).toHaveBeenCalledWith(1));
    await waitFor(() => expect(queryByText('要删的笔记')).toBeNull());

    const { toastState } = useGlobalToast();
    await waitFor(() => expect(toastState.visible).toBe(true));
    expect(toastState.message).toBe('已删除「要删的笔记」');

    await toastState.action.onClick();
    await waitFor(() => expect(getByText('要删的笔记')).toBeInTheDocument());
  });

  it('bulk-clears completed notes with an undo toast', async () => {
    const { getByRole, getByText } = await mountApp([
      serverNote({ id: 1, title: '已完成一', completed: true }),
      serverNote({ id: 2, title: '待办一' }),
    ]);
    await waitFor(() => expect(getByText('已完成一')).toBeInTheDocument());

    await fireEvent.click(getByRole('button', { name: '清除已完成' }));

    await waitFor(() =>
      expect(notebookApiMock.bulkRemove).toHaveBeenCalledWith([1])
    );
    const { toastState } = useGlobalToast();
    await waitFor(() => expect(toastState.visible).toBe(true));
    expect(toastState.message).toBe('已清除 1 条已完成笔记');

    await toastState.action.onClick();
    await waitFor(() =>
      expect(notebookApiMock.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: '已完成一', completed: true })
      )
    );
  });

  it('disables bulk clear when nothing is completed', async () => {
    const { getByRole } = await mountApp([serverNote({ id: 1 })]);
    await waitFor(() =>
      expect(getByRole('button', { name: '清除已完成' })).toBeDisabled()
    );
  });

  it('filters by search and clears filters from the empty state', async () => {
    const { getByLabelText, getByText, getByRole } = await mountApp([
      serverNote({ id: 1, title: '购物清单' }),
      serverNote({ id: 2, title: '工作报告' }),
    ]);
    await waitFor(() => expect(getByText('工作报告')).toBeInTheDocument());

    const searchInput = getByLabelText('搜索笔记');
    await fireEvent.update(searchInput, 'zzz');
    await waitFor(() =>
      expect(getByText('没有找到匹配的笔记')).toBeInTheDocument()
    );

    await fireEvent.click(getByRole('button', { name: '清除筛选条件' }));

    await waitFor(() => expect(searchInput.value).toBe(''));
    await waitFor(() => expect(getByText('工作报告')).toBeInTheDocument());
  });

  it('falls back to local mode when the server is unreachable', async () => {
    notebookApiMock.list.mockRejectedValue(new TypeError('network down'));
    const { getByText, getByPlaceholderText } = render(NotebookApp);

    await waitFor(() =>
      expect(getByText('服务器暂不可用，已切换到本地笔记')).toBeInTheDocument()
    );

    const input = getByPlaceholderText(/快速添加/);
    await fireEvent.update(input, '离线笔记');
    await fireEvent.keyUp(input, { key: 'Enter' });

    await waitFor(() => expect(getByText('离线笔记')).toBeInTheDocument());
    expect(notebookApiMock.create).not.toHaveBeenCalled();
    expect(
      getByText('当前处于本地模式，联网后新改动不会自动回传服务器。')
    ).toBeInTheDocument();
  });

  it('shows the first-note empty state and opens the form from it', async () => {
    const { getByText, getByRole, getByLabelText, queryByLabelText } =
      await mountApp([]);
    await waitFor(() => expect(getByText('还没有笔记')).toBeInTheDocument());

    await fireEvent.click(getByRole('button', { name: '新建笔记' }));

    expect(getByLabelText('标题 *')).toBeInTheDocument();
    expect(queryByLabelText('优先级')).toBeInTheDocument();
  });

  it('loads more notes beyond the display limit', async () => {
    const manyNotes = Array.from({ length: 55 }, (_, index) =>
      serverNote({ id: index + 1, title: `批量笔记${index + 1}` })
    );
    const { getByRole, queryByRole, getByText, queryByText } =
      await mountApp(manyNotes);

    await waitFor(() => expect(getByText('批量笔记50')).toBeInTheDocument());
    expect(queryByText('批量笔记55')).toBeNull();

    const loadMoreButton = getByRole('button', { name: /加载更多/ });
    expect(loadMoreButton).toHaveTextContent('加载更多 (5 条)');
    await fireEvent.click(loadMoreButton);

    await waitFor(() =>
      expect(queryByRole('button', { name: /加载更多/ })).toBeNull()
    );
    await waitFor(() => expect(getByText('批量笔记55')).toBeInTheDocument());
  });
});

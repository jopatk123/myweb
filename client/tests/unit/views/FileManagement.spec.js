import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import FileManagement from '@/views/FileManagement.vue';

const confirmMocks = vi.hoisted(() => ({
  confirmAction: vi.fn(() => true),
}));

vi.mock('@/components/common/AdminLayout.vue', () => ({
  default: {
    template:
      '<div class="admin-layout-stub"><slot name="module-sider" /><slot /></div>',
    props: ['siderVisible'],
  },
}));
vi.mock('@/components/common/PaginationControls.vue', () => ({
  default: {
    name: 'PaginationControlsStub',
    template: '<div class="pagination-stub" />',
    props: ['page', 'limit', 'total'],
    emits: ['prev', 'next', 'limit-change'],
  },
}));
vi.mock('@/components/file/FileUploadProgress.vue', () => ({
  default: {
    name: 'FileUploadProgressStub',
    template: '<div class="upload-progress-stub" />',
    props: ['uploading', 'progress'],
    emits: ['close'],
  },
}));

vi.mock('@/composables/useConfirm.js', () => ({
  useConfirm: () => ({
    confirmAction: confirmMocks.confirmAction,
    notify: vi.fn(),
  }),
}));

vi.mock('@/composables/useFiles.js', () => {
  const items = ref([]);
  const page = ref(1);
  const total = ref(0);
  const limit = ref(20);
  const type = ref('');
  const search = ref('');
  const loading = ref(false);
  const uploading = ref(false);
  const uploadProgress = ref(0);
  const uploadedBytes = ref(0);
  const totalBytes = ref(0);
  const currentFileName = ref('');
  const uploadQueue = ref([]);

  const fetchList = vi.fn(() => Promise.resolve());
  const upload = vi.fn(() => Promise.resolve());
  const remove = vi.fn(() => Promise.resolve());
  const getDownloadUrl = vi.fn(id => `/api/files/${id}/download`);
  const setPage = vi.fn(value => {
    page.value = value;
  });
  const setLimit = vi.fn(value => {
    limit.value = value;
  });

  const mock = {
    state: {
      items,
      page,
      total,
      limit,
      type,
      search,
      loading,
      uploading,
      uploadProgress,
      uploadedBytes,
      totalBytes,
      currentFileName,
      uploadQueue,
    },
    fns: { fetchList, upload, remove, getDownloadUrl, setPage, setLimit },
    reset: () => {
      items.value = [];
      page.value = 1;
      total.value = 0;
      limit.value = 20;
      type.value = '';
      search.value = '';
      loading.value = false;
      uploading.value = false;
      uploadProgress.value = 0;
      uploadedBytes.value = 0;
      totalBytes.value = 0;
      currentFileName.value = '';
      uploadQueue.value = [];
      Object.values(mock.fns).forEach(fn => fn.mockClear());
      mock.fns.fetchList.mockImplementation(() => Promise.resolve());
      mock.fns.upload.mockImplementation(() => Promise.resolve());
      mock.fns.remove.mockImplementation(() => Promise.resolve());
      mock.fns.getDownloadUrl.mockImplementation(
        id => `/api/files/${id}/download`
      );
      // setPage/setLimit 携带自定义实现，需在全局 restoreAllMocks 后恢复
      mock.fns.setPage.mockImplementation(value => {
        page.value = value;
      });
      mock.fns.setLimit.mockImplementation(value => {
        limit.value = value;
      });
    },
  };

  mock.reset();

  return {
    useFiles: () => ({ ...mock.state, ...mock.fns }),
    __mock: mock,
  };
});

const mountView = async () => {
  const module = await import('@/composables/useFiles.js');
  module.__mock.reset();
  const wrapper = mount(FileManagement);
  await flushPromises();
  return { wrapper, mock: module.__mock };
};

const selectFiles = async (wrapper, files) => {
  const input = wrapper.find('input.file-input');
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  });
  await input.trigger('change');
  await flushPromises();
};

const makeFile = name => new File(['content'], name, { type: 'text/plain' });

describe('FileManagement view', () => {
  beforeEach(async () => {
    const module = await import('@/composables/useFiles.js');
    module.__mock.reset();
    confirmMocks.confirmAction.mockClear();
    confirmMocks.confirmAction.mockImplementation(() => true);
  });

  it('loads the list on mount and renders rows with size, type and download link', async () => {
    const { wrapper, mock } = await mountView();
    mock.state.items.value = [
      {
        id: 11,
        originalName: 'photo.png',
        fileSize: 1536,
        typeCategory: 'image',
      },
      {
        id: 12,
        original_name: 'song.mp3',
        file_size: 1048576,
        type_category: 'audio',
      },
    ];
    mock.state.total.value = 2;
    await flushPromises();

    const rows = wrapper.findAll('.file-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('photo.png');
    expect(rows[0].text()).toContain('1.5 KB');
    expect(rows[0].text()).toContain('image');
    expect(rows[0].find('.download-link').attributes('href')).toBe(
      '/api/files/11/download'
    );
    expect(rows[1].text()).toContain('song.mp3');
    expect(rows[1].text()).toContain('1 MB');
    expect(wrapper.find('.file-count').text()).toBe('共 2 个文件');
    expect(mock.fns.fetchList).toHaveBeenCalledTimes(1);
  });

  it('falls back to dash for missing size and default icon for unknown type', async () => {
    const { wrapper, mock } = await mountView();
    mock.state.items.value = [{ id: 20, originalName: 'mystery.bin' }];
    await flushPromises();

    const row = wrapper.find('.file-row');
    expect(row.find('.file-size').text()).toBe('--');
    expect(row.find('.file-icon').text()).toBe('📄');
  });

  it('shows the empty state when no files exist', async () => {
    const { wrapper } = await mountView();

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-state').text()).toContain('暂无文件');
  });

  it('uploads selected files and reports success with count', async () => {
    const { wrapper, mock } = await mountView();

    await selectFiles(wrapper, [makeFile('a.txt'), makeFile('b.txt')]);

    expect(mock.fns.upload).toHaveBeenCalledTimes(1);
    const uploaded = mock.fns.upload.mock.calls[0][0];
    expect(uploaded.map(f => f.name)).toEqual(['a.txt', 'b.txt']);
    const banner = wrapper.find('.status-banner');
    expect(banner.classes()).toContain('status-success');
    expect(banner.text()).toContain('已成功上传 2 个文件');
  });

  it('surfaces upload failures in the error banner', async () => {
    const { wrapper, mock } = await mountView();
    mock.fns.upload.mockRejectedValueOnce(new Error('磁盘已满'));

    await selectFiles(wrapper, [makeFile('a.txt')]);

    const banner = wrapper.find('.status-banner');
    expect(banner.classes()).toContain('status-error');
    expect(banner.text()).toContain('磁盘已满');
  });

  it('ignores empty file selections', async () => {
    const { wrapper, mock } = await mountView();

    await selectFiles(wrapper, []);

    expect(mock.fns.upload).not.toHaveBeenCalled();
    expect(wrapper.find('.status-banner').exists()).toBe(false);
  });

  it('search via button and enter key reloads from the first page', async () => {
    const { wrapper, mock } = await mountView();
    mock.state.page.value = 3;

    await wrapper.find('input.search-input').setValue('报告');
    await wrapper.find('button.search-btn').trigger('click');

    expect(wrapper.vm.search).toBe('报告');
    expect(mock.fns.setPage).toHaveBeenLastCalledWith(1);
    expect(mock.fns.fetchList).toHaveBeenCalledTimes(2);

    await wrapper.find('input.search-input').trigger('keyup.enter');
    expect(mock.fns.fetchList).toHaveBeenCalledTimes(3);
  });

  it('type filter change resets page and reloads', async () => {
    const { wrapper, mock } = await mountView();
    mock.state.page.value = 4;

    await wrapper.find('select.filter-select').setValue('image');

    expect(mock.fns.setPage).toHaveBeenLastCalledWith(1);
    expect(mock.fns.fetchList).toHaveBeenCalledTimes(2);
    expect(wrapper.vm.type).toBe('image');
  });

  it('prev page guards first page and reloads otherwise', async () => {
    const { wrapper, mock } = await mountView();
    const pagination = wrapper.findComponent({
      name: 'PaginationControlsStub',
    });

    pagination.vm.$emit('prev');
    await flushPromises();
    expect(mock.fns.fetchList).toHaveBeenCalledTimes(1);

    mock.state.page.value = 2;
    pagination.vm.$emit('prev');
    await flushPromises();
    expect(mock.fns.setPage).toHaveBeenLastCalledWith(1);
    expect(mock.fns.fetchList).toHaveBeenCalledTimes(2);
  });

  it('next page guards the last page and reloads otherwise', async () => {
    const { wrapper, mock } = await mountView();
    mock.state.total.value = 45;
    mock.state.limit.value = 20;
    const pagination = wrapper.findComponent({
      name: 'PaginationControlsStub',
    });

    pagination.vm.$emit('next');
    await flushPromises();
    expect(mock.fns.setPage).toHaveBeenLastCalledWith(2);
    expect(mock.fns.fetchList).toHaveBeenCalledTimes(2);

    mock.state.page.value = 3;
    pagination.vm.$emit('next');
    await flushPromises();
    expect(mock.fns.fetchList).toHaveBeenCalledTimes(2);
  });

  it('limit change resets page and applies the new limit', async () => {
    const { wrapper, mock } = await mountView();
    mock.state.page.value = 5;
    const pagination = wrapper.findComponent({
      name: 'PaginationControlsStub',
    });

    pagination.vm.$emit('limit-change', 50);

    expect(mock.fns.setPage).toHaveBeenLastCalledWith(1);
    expect(mock.fns.setLimit).toHaveBeenCalledWith(50);
    expect(mock.state.limit.value).toBe(50);
  });

  it('delete asks for confirmation and reports success', async () => {
    const { wrapper, mock } = await mountView();
    mock.state.items.value = [{ id: 30, originalName: 'doc.pdf' }];
    await flushPromises();

    await wrapper.find('.delete-btn').trigger('click');

    expect(confirmMocks.confirmAction).toHaveBeenCalledWith(
      '确认删除文件“doc.pdf”？'
    );
    expect(mock.fns.remove).toHaveBeenCalledWith(30);
    const banner = wrapper.find('.status-banner');
    expect(banner.classes()).toContain('status-success');
    expect(banner.text()).toContain('文件删除成功');
  });

  it('delete falls back to generic name and surfaces failures', async () => {
    const { wrapper, mock } = await mountView();
    mock.state.items.value = [{ id: 31 }];
    await flushPromises();
    mock.fns.remove.mockRejectedValueOnce(new Error('文件被占用'));

    await wrapper.find('.delete-btn').trigger('click');

    expect(confirmMocks.confirmAction).toHaveBeenCalledWith(
      '确认删除文件“该文件”？'
    );
    const banner = wrapper.find('.status-banner');
    expect(banner.classes()).toContain('status-error');
    expect(banner.text()).toContain('文件被占用');
  });

  it('cancelled delete confirmation never calls remove', async () => {
    const { wrapper, mock } = await mountView();
    mock.state.items.value = [{ id: 32, originalName: 'keep.txt' }];
    await flushPromises();
    confirmMocks.confirmAction.mockReturnValueOnce(false);

    await wrapper.find('.delete-btn').trigger('click');

    expect(mock.fns.remove).not.toHaveBeenCalled();
    expect(wrapper.find('.status-banner').exists()).toBe(false);
  });

  it('shows a load failure banner and clears it after a successful refetch', async () => {
    const module = await import('@/composables/useFiles.js');
    module.__mock.reset();
    module.__mock.fns.fetchList.mockRejectedValueOnce(new Error('网络异常'));

    const wrapper = mount(FileManagement);
    await flushPromises();

    let banner = wrapper.find('.status-banner');
    expect(banner.classes()).toContain('status-error');
    expect(banner.text()).toContain('网络异常');

    await wrapper.find('button.search-btn').trigger('click');
    await flushPromises();

    banner = wrapper.find('.status-banner');
    expect(banner.exists()).toBe(false);
  });

  it('close button dismisses the status banner', async () => {
    const { wrapper, mock } = await mountView();
    mock.fns.upload.mockRejectedValueOnce(new Error('上传失败'));

    await selectFiles(wrapper, [makeFile('a.txt')]);
    expect(wrapper.find('.status-banner').exists()).toBe(true);

    await wrapper.find('.close-status').trigger('click');

    expect(wrapper.find('.status-banner').exists()).toBe(false);
  });

  it('shows the loading overlay while fetching', async () => {
    const { wrapper, mock } = await mountView();
    mock.state.loading.value = true;
    await flushPromises();

    expect(wrapper.find('.loading-overlay').exists()).toBe(true);
    expect(wrapper.find('.loading-overlay').text()).toContain('加载中...');
  });
});

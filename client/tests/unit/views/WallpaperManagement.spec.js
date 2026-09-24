import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import WallpaperManagement from '@/views/WallpaperManagement.vue';

const toastMocks = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
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
vi.mock('@/components/wallpaper/WallpaperSidebar.vue', () => ({
  default: {
    name: 'WallpaperSidebarStub',
    template: '<div class="sidebar-stub" />',
    props: ['groups', 'selectedGroupId'],
    emits: ['select-group', 'create-group', 'delete-group', 'apply-current'],
  },
}));
vi.mock('@/components/wallpaper/WallpaperHeader.vue', () => ({
  default: {
    name: 'WallpaperHeaderStub',
    template: '<div class="header-stub" />',
    props: ['selectedCount'],
    emits: [
      'upload-wallpaper',
      'open-bulk-upload',
      'bulk-delete',
      'bulk-move',
      'download-wallpapers',
      'open-main-window',
    ],
  },
}));
vi.mock('@/components/wallpaper/WallpaperToolbar.vue', () => ({
  default: {
    name: 'WallpaperToolbarStub',
    template: '<div class="toolbar-stub" />',
    props: ['keyword'],
    emits: ['update:keyword'],
  },
}));
vi.mock('@/components/wallpaper/WallpaperList.vue', () => ({
  default: {
    name: 'WallpaperListStub',
    template: '<div class="list-stub" />',
    props: ['modelValue', 'wallpapers', 'activeWallpaper'],
    emits: ['update:modelValue', 'delete', 'edit'],
  },
}));
vi.mock('@/components/wallpaper/WallpaperUploadModal.vue', () => ({
  default: {
    name: 'WallpaperUploadModalStub',
    template: '<div class="upload-modal-stub" />',
    props: ['groups'],
    emits: ['close', 'uploaded', 'open-bulk'],
  },
}));
vi.mock('@/components/wallpaper/WallpaperBulkUploadModal.vue', () => ({
  default: {
    name: 'WallpaperBulkUploadModalStub',
    template: '<div class="bulk-upload-modal-stub" />',
    props: ['groups'],
    emits: ['close', 'uploaded'],
  },
}));
vi.mock('@/components/wallpaper/GroupCreateModal.vue', () => ({
  default: {
    name: 'GroupCreateModalStub',
    template: '<div class="group-create-modal-stub" />',
    emits: ['close', 'created'],
  },
}));
vi.mock('@/components/wallpaper/GroupMoveModal.vue', () => ({
  default: {
    name: 'GroupMoveModalStub',
    template: '<div class="group-move-modal-stub" />',
    props: ['count', 'groups', 'loading'],
    emits: ['close', 'confirm'],
  },
}));
vi.mock('@/components/wallpaper/WallpaperEditModal.vue', () => ({
  default: {
    name: 'WallpaperEditModalStub',
    template: '<div class="edit-modal-stub" />',
    props: ['wallpaper'],
    emits: ['close', 'saved'],
  },
}));

vi.mock('@/composables/useGlobalToast.js', () => ({
  useGlobalToast: () => ({
    showSuccess: toastMocks.showSuccess,
    showError: toastMocks.showError,
    showInfo: toastMocks.showInfo,
  }),
}));

vi.mock('@/composables/useWallpaper.js', () => {
  const wallpapers = ref([]);
  const groups = ref([]);
  const currentGroup = ref(null);
  const activeWallpaper = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const page = ref(1);
  const limit = ref(20);
  const total = ref(0);

  const fetchWallpapers = vi.fn(() => Promise.resolve());
  const fetchGroups = vi.fn(() => Promise.resolve());
  const fetchCurrentGroup = vi.fn(() => Promise.resolve());
  const fetchActiveWallpaper = vi.fn(() => Promise.resolve());
  const deleteWallpaper = vi.fn(() => Promise.resolve());
  const deleteGroup = vi.fn(() => Promise.resolve());
  const deleteMultipleWallpapers = vi.fn(() => Promise.resolve());
  const moveMultipleWallpapers = vi.fn(() => Promise.resolve());
  const applyCurrentGroup = vi.fn(() => Promise.resolve());
  const downloadWallpapers = vi.fn(() => Promise.resolve());
  const setPage = vi.fn(value => {
    page.value = value;
  });
  const setLimit = vi.fn(value => {
    limit.value = value;
  });

  const mock = {
    state: {
      wallpapers,
      groups,
      currentGroup,
      activeWallpaper,
      loading,
      error,
      page,
      limit,
      total,
    },
    fns: {
      fetchWallpapers,
      fetchGroups,
      fetchCurrentGroup,
      fetchActiveWallpaper,
      deleteWallpaper,
      deleteGroup,
      deleteMultipleWallpapers,
      moveMultipleWallpapers,
      applyCurrentGroup,
      downloadWallpapers,
      setPage,
      setLimit,
    },
    reset: () => {
      wallpapers.value = [];
      groups.value = [];
      currentGroup.value = null;
      activeWallpaper.value = null;
      loading.value = false;
      error.value = null;
      page.value = 1;
      limit.value = 20;
      total.value = 0;
      Object.values(mock.fns).forEach(fn => fn.mockClear());
      Object.values(mock.fns).forEach(fn => {
        if (typeof fn.mock === 'object') {
          fn.mockImplementation(() => Promise.resolve());
        }
      });
      // setPage/setLimit 携带自定义实现，需在通用 mockImplementation 后恢复
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
    useWallpaper: () => ({ ...mock.state, ...mock.fns }),
    __mock: mock,
  };
});

const mountView = async () => {
  const module = await import('@/composables/useWallpaper.js');
  module.__mock.reset();
  module.__mock.state.groups.value = [
    { id: 1, name: '默认' },
    { id: 2, name: '风景' },
  ];
  module.__mock.state.wallpapers.value = [
    { id: 10, name: 'sunset.jpg' },
    { id: 11, original_name: 'mountain.png' },
  ];
  const wrapper = mount(WallpaperManagement);
  await flushPromises();
  return { wrapper, mock: module.__mock };
};

describe('WallpaperManagement view (core)', () => {
  beforeEach(async () => {
    const module = await import('@/composables/useWallpaper.js');
    module.__mock.reset();
    toastMocks.showSuccess.mockClear();
    toastMocks.showError.mockClear();
    toastMocks.showInfo.mockClear();
  });

  it('fetches wallpapers, groups, current group and active wallpaper on mount', async () => {
    const { wrapper, mock } = await mountView();

    expect(mock.fns.fetchWallpapers).toHaveBeenCalledWith(null, true);
    expect(mock.fns.fetchGroups).toHaveBeenCalledTimes(1);
    expect(mock.fns.fetchCurrentGroup).toHaveBeenCalledTimes(1);
    expect(mock.fns.fetchActiveWallpaper).toHaveBeenCalledTimes(1);
    expect(
      wrapper.findComponent({ name: 'WallpaperListStub' }).props('wallpapers')
    ).toHaveLength(2);
  });

  it('shows error/loading banners and empty state from composable state', async () => {
    const { wrapper, mock } = await mountView();

    mock.state.error.value = '加载失败';
    mock.state.loading.value = true;
    await nextTickIfPossible(wrapper);
    expect(wrapper.find('.error-message').text()).toBe('加载失败');
    expect(wrapper.find('.loading').exists()).toBe(true);

    mock.state.loading.value = false;
    mock.state.error.value = null;
    mock.state.wallpapers.value = [];
    await nextTickIfPossible(wrapper);
    expect(wrapper.find('.empty-state').exists()).toBe(true);
  });

  it('flags the current group for the sidebar (object, raw id or none)', async () => {
    const { wrapper, mock } = await mountView();

    mock.state.currentGroup.value = { id: 2 };
    expect(wrapper.vm.groupsWithFlag.map(g => g.is_current)).toEqual([
      false,
      true,
    ]);

    mock.state.currentGroup.value = 1;
    expect(wrapper.vm.groupsWithFlag.map(g => g.is_current)).toEqual([
      true,
      false,
    ]);

    mock.state.currentGroup.value = null;
    expect(wrapper.vm.groupsWithFlag.every(g => !g.is_current)).toBe(true);
  });

  it('selectGroup switches filter, resets page and clears selection', async () => {
    const { wrapper, mock } = await mountView();
    wrapper.vm.selectedIds = [10];

    wrapper
      .findComponent({ name: 'WallpaperSidebarStub' })
      .vm.$emit('select-group', 2);

    expect(wrapper.vm.selectedGroupId).toBe(2);
    expect(mock.fns.setPage).toHaveBeenCalledWith(1);
    expect(mock.fns.fetchWallpapers).toHaveBeenLastCalledWith(2, true);
    expect(wrapper.vm.selectedIds).toEqual([]);
  });

  it('keyword filters wallpapers by name or original filename', async () => {
    const { wrapper } = await mountView();

    wrapper.vm.keyword = 'SUN';
    expect(wrapper.vm.filteredWallpapers.map(w => w.id)).toEqual([10]);

    wrapper.vm.keyword = 'mountain';
    expect(wrapper.vm.filteredWallpapers.map(w => w.id)).toEqual([11]);

    wrapper.vm.keyword = '';
    expect(wrapper.vm.filteredWallpapers).toHaveLength(2);
  });

  it('shows the selected group name chip only when a group is picked', async () => {
    const { wrapper } = await mountView();
    expect(wrapper.find('.filter-chip').exists()).toBe(false);

    wrapper.vm.selectedGroupId = 2;
    await nextTickIfPossible(wrapper);
    expect(wrapper.find('.filter-chip').text()).toContain('分组: 风景');
  });

  it('list delete/edit events wire to composable and edit modal', async () => {
    const { wrapper, mock } = await mountView();
    wrapper.vm.selectedGroupId = 3;
    const list = wrapper.findComponent({ name: 'WallpaperListStub' });

    list.vm.$emit('delete', 10);
    expect(mock.fns.deleteWallpaper).toHaveBeenCalledWith(10, 3);

    list.vm.$emit('edit', { id: 11, name: 'mountain.png' });
    expect(wrapper.vm.showEditModal).toBe(true);
    expect(wrapper.vm.editingWallpaper).toEqual({
      id: 11,
      name: 'mountain.png',
    });
  });

  it('upload modal lifecycle refreshes list from first page', async () => {
    const { wrapper, mock } = await mountView();
    const header = wrapper.findComponent({ name: 'WallpaperHeaderStub' });

    header.vm.$emit('upload-wallpaper');
    await nextTickIfPossible(wrapper);
    expect(wrapper.vm.showUploadModal).toBe(true);

    const uploadModal = wrapper.findComponent({
      name: 'WallpaperUploadModalStub',
    });
    uploadModal.vm.$emit('uploaded');
    await nextTickIfPossible(wrapper);
    expect(wrapper.vm.showUploadModal).toBe(false);
    expect(mock.fns.setPage).toHaveBeenCalledWith(1);
    expect(mock.fns.fetchWallpapers).toHaveBeenLastCalledWith(null, true);

    header.vm.$emit('upload-wallpaper');
    await nextTickIfPossible(wrapper);
    wrapper
      .findComponent({ name: 'WallpaperUploadModalStub' })
      .vm.$emit('open-bulk');
    await nextTickIfPossible(wrapper);
    expect(wrapper.vm.showUploadModal).toBe(false);
    expect(wrapper.vm.showBulkUploadModal).toBe(true);

    wrapper
      .findComponent({ name: 'WallpaperBulkUploadModalStub' })
      .vm.$emit('uploaded');
    await nextTickIfPossible(wrapper);
    expect(wrapper.vm.showBulkUploadModal).toBe(false);
    expect(mock.fns.setPage).toHaveBeenLastCalledWith(1);
    expect(mock.fns.fetchWallpapers).toHaveBeenLastCalledWith(null, true);
  });

  it('group creation refreshes groups and reports success', async () => {
    const { wrapper, mock } = await mountView();
    wrapper
      .findComponent({ name: 'WallpaperSidebarStub' })
      .vm.$emit('create-group');
    await nextTickIfPossible(wrapper);
    expect(wrapper.vm.showGroupModal).toBe(true);

    wrapper.findComponent({ name: 'GroupCreateModalStub' }).vm.$emit('created');
    await nextTickIfPossible(wrapper);

    expect(wrapper.vm.showGroupModal).toBe(false);
    expect(mock.fns.fetchGroups).toHaveBeenCalledTimes(2);
    expect(toastMocks.showSuccess).toHaveBeenCalledWith('分组已创建');
  });

  it('edit save closes modal, refetches wallpapers and toasts', async () => {
    const { wrapper, mock } = await mountView();
    wrapper.vm.selectedGroupId = 2;
    wrapper
      .findComponent({ name: 'WallpaperListStub' })
      .vm.$emit('edit', { id: 10 });
    await nextTickIfPossible(wrapper);
    expect(wrapper.vm.showEditModal).toBe(true);

    wrapper.findComponent({ name: 'WallpaperEditModalStub' }).vm.$emit('saved');
    await flushPromises();

    expect(wrapper.vm.showEditModal).toBe(false);
    expect(wrapper.vm.editingWallpaper).toBeNull();
    expect(mock.fns.fetchWallpapers).toHaveBeenLastCalledWith(2, true);
    expect(toastMocks.showSuccess).toHaveBeenCalledWith('编辑保存成功');
  });

  it('opens the desktop in a new window from the header action', async () => {
    const { wrapper } = await mountView();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    wrapper
      .findComponent({ name: 'WallpaperHeaderStub' })
      .vm.$emit('open-main-window');

    expect(openSpy).toHaveBeenCalledWith('/', '_blank', 'noopener,noreferrer');
  });

  it('pagination navigates within bounds and applies limit changes', async () => {
    const { wrapper, mock } = await mountView();
    mock.state.total.value = 45;
    mock.state.limit.value = 20;
    wrapper.vm.selectedGroupId = 2;
    const pagination = wrapper.findComponent({
      name: 'PaginationControlsStub',
    });

    pagination.vm.$emit('prev');
    expect(mock.fns.fetchWallpapers).toHaveBeenCalledTimes(1);

    pagination.vm.$emit('next');
    expect(mock.state.page.value).toBe(2);
    expect(mock.fns.fetchWallpapers).toHaveBeenLastCalledWith(2, true);

    mock.state.page.value = 3;
    pagination.vm.$emit('next');
    expect(mock.fns.fetchWallpapers).toHaveBeenCalledTimes(2);

    pagination.vm.$emit('limit-change', 50);
    expect(mock.fns.setLimit).toHaveBeenCalledWith(50);
    expect(mock.state.page.value).toBe(1);
  });
});

async function nextTickIfPossible(wrapper) {
  await wrapper.vm.$nextTick();
}

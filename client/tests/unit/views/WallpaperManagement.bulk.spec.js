import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
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
  const wrapper = mount(WallpaperManagement);
  await flushPromises();
  return { wrapper, mock: module.__mock };
};

describe('WallpaperManagement view (bulk & group operations)', () => {
  beforeEach(async () => {
    const module = await import('@/composables/useWallpaper.js');
    module.__mock.reset();
    toastMocks.showSuccess.mockClear();
    toastMocks.showError.mockClear();
    toastMocks.showInfo.mockClear();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('bulk delete requires a selection and confirmation', async () => {
    const { wrapper, mock } = await mountView();
    const header = wrapper.findComponent({ name: 'WallpaperHeaderStub' });
    const confirmSpy = window.confirm;

    header.vm.$emit('bulk-delete');
    expect(mock.fns.deleteMultipleWallpapers).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();

    wrapper.vm.selectedIds = [10, 11];
    confirmSpy.mockReturnValueOnce(false);
    header.vm.$emit('bulk-delete');
    expect(mock.fns.deleteMultipleWallpapers).not.toHaveBeenCalled();

    header.vm.$emit('bulk-delete');
    await flushPromises();
    expect(mock.fns.deleteMultipleWallpapers).toHaveBeenCalledWith(
      [10, 11],
      ''
    );
    expect(wrapper.vm.selectedIds).toEqual([]);
    expect(toastMocks.showSuccess).toHaveBeenCalledWith('批量删除成功');
  });

  it('bulk delete forwards the selected group and reports failures', async () => {
    const { wrapper, mock } = await mountView();
    wrapper.vm.selectedIds = [10];
    wrapper.vm.selectedGroupId = 3;

    mock.fns.deleteMultipleWallpapers.mockRejectedValueOnce(
      new Error('部分壁纸被占用')
    );
    wrapper
      .findComponent({ name: 'WallpaperHeaderStub' })
      .vm.$emit('bulk-delete');
    await flushPromises();

    expect(mock.fns.deleteMultipleWallpapers).toHaveBeenCalledWith([10], 3);
    expect(toastMocks.showError).toHaveBeenCalledWith('部分壁纸被占用');
    expect(wrapper.vm.selectedIds).toEqual([10]);
  });

  it('bulk move validates selection then clears state on success', async () => {
    const { wrapper, mock } = await mountView();
    const moveModal = () =>
      wrapper.findComponent({ name: 'GroupMoveModalStub' });

    wrapper
      .findComponent({ name: 'WallpaperHeaderStub' })
      .vm.$emit('bulk-move');
    await nextTick();
    expect(moveModal().exists()).toBe(true);

    moveModal().vm.$emit('confirm', 4);
    expect(mock.fns.moveMultipleWallpapers).not.toHaveBeenCalled();
    expect(wrapper.vm.bulkMoveLoading).toBe(false);

    wrapper.vm.selectedIds = [10, 11];
    moveModal().vm.$emit('confirm', 4);
    await flushPromises();

    expect(mock.fns.moveMultipleWallpapers).toHaveBeenCalledWith(
      [10, 11],
      4,
      ''
    );
    expect(wrapper.vm.selectedIds).toEqual([]);
    expect(wrapper.vm.showMoveModal).toBe(false);
    expect(wrapper.vm.bulkMoveLoading).toBe(false);
    expect(toastMocks.showSuccess).toHaveBeenCalledWith('移动成功');
  });

  it('bulk move failures keep the modal open and reset loading', async () => {
    const { wrapper, mock } = await mountView();
    wrapper.vm.selectedIds = [10];
    wrapper.vm.showMoveModal = true;
    await nextTick();
    mock.fns.moveMultipleWallpapers.mockRejectedValueOnce(
      new Error('移动失败')
    );

    wrapper
      .findComponent({ name: 'GroupMoveModalStub' })
      .vm.$emit('confirm', 4);
    await flushPromises();

    expect(toastMocks.showError).toHaveBeenCalledWith('移动失败');
    expect(wrapper.vm.showMoveModal).toBe(true);
    expect(wrapper.vm.bulkMoveLoading).toBe(false);

    wrapper.findComponent({ name: 'GroupMoveModalStub' }).vm.$emit('close');
    expect(wrapper.vm.showMoveModal).toBe(false);
  });

  it('download reports single and packaged results', async () => {
    const { wrapper, mock } = await mountView();
    const header = wrapper.findComponent({ name: 'WallpaperHeaderStub' });

    header.vm.$emit('download-wallpapers');
    expect(mock.fns.downloadWallpapers).not.toHaveBeenCalled();

    wrapper.vm.selectedIds = [7];
    header.vm.$emit('download-wallpapers');
    await flushPromises();
    expect(mock.fns.downloadWallpapers).toHaveBeenCalledWith([7]);
    expect(toastMocks.showSuccess).toHaveBeenLastCalledWith('壁纸已下载');

    wrapper.vm.selectedIds = [7, 8];
    header.vm.$emit('download-wallpapers');
    await flushPromises();
    expect(toastMocks.showSuccess).toHaveBeenLastCalledWith(
      '2 张壁纸已打包下载'
    );
  });

  it('download failures surface an error toast', async () => {
    const { wrapper, mock } = await mountView();
    wrapper.vm.selectedIds = [7];
    mock.fns.downloadWallpapers.mockRejectedValueOnce(new Error('网络中断'));

    wrapper
      .findComponent({ name: 'WallpaperHeaderStub' })
      .vm.$emit('download-wallpapers');
    await flushPromises();

    expect(toastMocks.showError).toHaveBeenCalledWith('网络中断');
  });

  it('apply current group refreshes the current group binding', async () => {
    const { wrapper, mock } = await mountView();
    const sidebar = wrapper.findComponent({ name: 'WallpaperSidebarStub' });

    sidebar.vm.$emit('apply-current');
    expect(mock.fns.applyCurrentGroup).not.toHaveBeenCalled();

    wrapper.vm.selectedGroupId = 2;
    sidebar.vm.$emit('apply-current');
    await flushPromises();
    expect(mock.fns.applyCurrentGroup).toHaveBeenCalledWith(2);
    expect(mock.fns.fetchCurrentGroup).toHaveBeenCalledTimes(2);
    expect(toastMocks.showSuccess).toHaveBeenCalledWith(
      '已将该分组设为当前应用分组'
    );
  });

  it('apply current failures surface an error toast', async () => {
    const { wrapper, mock } = await mountView();
    wrapper.vm.selectedGroupId = 2;
    mock.fns.applyCurrentGroup.mockRejectedValueOnce(new Error('设置失败'));

    wrapper
      .findComponent({ name: 'WallpaperSidebarStub' })
      .vm.$emit('apply-current');
    await flushPromises();

    expect(toastMocks.showError).toHaveBeenCalledWith('设置失败');
  });

  it('group deletion switches back to all groups on success', async () => {
    const { wrapper, mock } = await mountView();
    const sidebar = wrapper.findComponent({ name: 'WallpaperSidebarStub' });

    sidebar.vm.$emit('delete-group');
    expect(mock.fns.deleteGroup).not.toHaveBeenCalled();

    wrapper.vm.selectedGroupId = 2;
    window.confirm.mockReturnValueOnce(false);
    sidebar.vm.$emit('delete-group');
    expect(mock.fns.deleteGroup).not.toHaveBeenCalled();

    sidebar.vm.$emit('delete-group');
    await flushPromises();
    expect(mock.fns.deleteGroup).toHaveBeenCalledWith(2);
    expect(wrapper.vm.selectedGroupId).toBe('');
    expect(mock.fns.fetchGroups).toHaveBeenCalledTimes(2);
    expect(mock.fns.fetchWallpapers).toHaveBeenLastCalledWith(null, true);
    expect(toastMocks.showSuccess).toHaveBeenCalledWith('分组已删除');
  });

  it('group deletion failures surface an error toast', async () => {
    const { wrapper, mock } = await mountView();
    wrapper.vm.selectedGroupId = 2;
    mock.fns.deleteGroup.mockRejectedValueOnce(new Error('分组下仍有壁纸'));

    wrapper
      .findComponent({ name: 'WallpaperSidebarStub' })
      .vm.$emit('delete-group');
    await flushPromises();

    expect(toastMocks.showError).toHaveBeenCalledWith('分组下仍有壁纸');
    expect(wrapper.vm.selectedGroupId).toBe(2);
  });
});

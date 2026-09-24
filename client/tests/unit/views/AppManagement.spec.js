import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import AppManagement from '@/views/AppManagement.vue';

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
vi.mock('@/components/app/AppSidebar.vue', () => ({
  default: {
    template: '<div class="sidebar-stub" />',
    props: ['groups', 'selectedGroupId'],
  },
}));
vi.mock('@/components/common/PaginationControls.vue', () => ({
  default: {
    template: '<div class="pagination-stub" />',
    props: ['page', 'limit', 'total'],
  },
}));
vi.mock('@/components/app/AppListTable.vue', () => ({
  default: {
    template: '<div class="list-table-stub" />',
    props: ['apps', 'groups', 'selectedIds', 'allSelected'],
  },
}));
vi.mock('@/components/app/AppCreateModal.vue', () => ({
  default: {
    template: '<div class="create-modal-stub" />',
    props: ['show', 'groupId'],
  },
}));
vi.mock('@/components/app/AppEditModal.vue', () => ({
  default: {
    template: '<div class="edit-modal-stub" />',
    props: ['show', 'app'],
  },
}));
vi.mock('@/components/app/AppGroupModal.vue', () => ({
  default: {
    template: '<div class="group-modal-stub" />',
    props: ['show', 'mode', 'group'],
  },
}));
vi.mock('@/components/app/AppMoveModal.vue', () => ({
  default: {
    template: '<div class="move-modal-stub" />',
    props: ['show', 'groups'],
  },
}));

vi.mock('@/composables/useGlobalToast.js', () => ({
  useGlobalToast: () => ({
    showSuccess: toastMocks.showSuccess,
    showError: toastMocks.showError,
    showInfo: toastMocks.showInfo,
  }),
}));

vi.mock('@/composables/useApps.js', () => {
  const apps = ref([]);
  const groups = ref([]);
  const loading = ref(false);
  const error = ref('');
  const page = ref(1);
  const limit = ref(20);
  const total = ref(0);

  const fetchApps = vi.fn(() => Promise.resolve());
  const fetchGroups = vi.fn(() => Promise.resolve());
  const deleteApp = vi.fn(() => Promise.resolve());
  const setVisible = vi.fn(() => Promise.resolve());
  const setAutostart = vi.fn(() => Promise.resolve());
  const createApp = vi.fn(() => Promise.resolve());
  const updateApp = vi.fn(() => Promise.resolve());
  const createGroup = vi.fn(() => Promise.resolve());
  const updateGroup = vi.fn(() => Promise.resolve());
  const deleteGroup = vi.fn(() => Promise.resolve());
  const moveApps = vi.fn(() => Promise.resolve());
  const setPage = vi.fn(value => {
    page.value = value;
  });
  const setLimit = vi.fn(value => {
    limit.value = value;
  });

  const ensureAsync = fn => {
    fn.mockImplementation(() => Promise.resolve());
  };

  const mock = {
    state: {
      apps,
      groups,
      loading,
      error,
      page,
      limit,
      total,
    },
    fns: {
      fetchApps,
      fetchGroups,
      deleteApp,
      setVisible,
      setAutostart,
      createApp,
      updateApp,
      createGroup,
      updateGroup,
      deleteGroup,
      moveApps,
      setPage,
      setLimit,
    },
    reset: () => {
      apps.value = [];
      groups.value = [];
      loading.value = false;
      error.value = '';
      page.value = 1;
      limit.value = 20;
      total.value = 0;
      Object.values(mock.fns).forEach(fn => {
        if (typeof fn.mock === 'object') {
          fn.mockClear();
        }
      });
      Object.values(mock.fns).forEach(ensureAsync);
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
    useApps: () => ({
      ...mock.state,
      ...mock.fns,
    }),
    getAppIconUrl: vi.fn(() => '/mock/icon.png'),
    __mock: mock,
  };
});

const mountComponent = async () => {
  const module = await import('@/composables/useApps.js');
  module.__mock.reset();
  module.__mock.state.apps.value = [
    { id: 1, name: 'App One', slug: 'app-one', is_visible: 1 },
    { id: 2, name: 'App Two', slug: 'app-two', is_visible: 1 },
  ];
  module.__mock.state.groups.value = [
    { id: 1, name: '默认' },
    { id: 2, name: '工作' },
  ];
  module.__mock.fns.fetchApps.mockImplementation(() => Promise.resolve());
  module.__mock.fns.fetchGroups.mockImplementation(() => Promise.resolve());

  const wrapper = mount(AppManagement, {
    global: {
      stubs: {
        'router-link': {
          template: '<span><slot /></span>',
        },
      },
    },
  });

  await flushPromises();
  return { wrapper, mock: module.__mock };
};

describe('AppManagement view', () => {
  beforeEach(async () => {
    const module = await import('@/composables/useApps.js');
    module.__mock.reset();
    toastMocks.showSuccess.mockClear();
    toastMocks.showError.mockClear();
    toastMocks.showInfo.mockClear();
  });

  it('selectGroup resets selection and reloads apps for target group', async () => {
    const { wrapper, mock } = await mountComponent();
    wrapper.vm.selectedIds = [1, 2];

    mock.fns.fetchApps.mockClear();

    await wrapper.vm.selectGroup(2);
    await nextTick();

    expect(mock.fns.fetchApps).toHaveBeenLastCalledWith({ groupId: 2 }, true);
    expect(wrapper.vm.selectedIds).toEqual([]);
    expect(mock.state.page.value).toBe(1);
  });

  it('removes stale selections when app list changes', async () => {
    const { wrapper, mock } = await mountComponent();
    wrapper.vm.selectedIds = [1, 999];

    mock.state.apps.value = [
      { id: 1, name: 'App One', slug: 'app-one', is_visible: 1 },
      { id: 3, name: 'App Three', slug: 'app-three', is_visible: 1 },
    ];

    await nextTick();
    await nextTick();

    expect(wrapper.vm.selectedIds).toEqual([1]);
  });

  it('remove clears selection entry and reloads', async () => {
    const { wrapper, mock } = await mountComponent();
    wrapper.vm.selectedIds = [1, 2];

    mock.fns.fetchApps.mockClear();
    mock.fns.deleteApp.mockResolvedValueOnce(true);

    await wrapper.vm.remove(1);
    await nextTick();

    expect(mock.fns.deleteApp).toHaveBeenCalledWith(1);
    expect(mock.fns.fetchApps).toHaveBeenCalledWith({ groupId: null }, true);
    expect(wrapper.vm.selectedIds).toEqual([2]);
  });

  it('keyword filters apps by name or description and toggleAll drives allSelected', async () => {
    const { wrapper, mock } = await mountComponent();
    mock.state.apps.value[0].description = '前端工具集合';

    wrapper.vm.keyword = '前端';
    await nextTick();
    expect(wrapper.vm.filteredApps.map(a => a.id)).toEqual([1]);

    wrapper.vm.keyword = 'APP TWO';
    await nextTick();
    expect(wrapper.vm.filteredApps.map(a => a.id)).toEqual([2]);

    wrapper.vm.keyword = '  ';
    await nextTick();
    expect(wrapper.vm.filteredApps).toHaveLength(2);
    expect(wrapper.vm.allSelected).toBe(false);

    wrapper.vm.toggleAll(true);
    expect(wrapper.vm.selectedIds).toEqual([1, 2]);
    expect(wrapper.vm.allSelected).toBe(true);

    wrapper.vm.toggleAll(false);
    expect(wrapper.vm.selectedIds).toEqual([]);
  });

  it('toolbar opens create/move modals and move button is gated by selection', async () => {
    const { wrapper } = await mountComponent();
    const findButton = text =>
      wrapper.findAll('button').find(btn => btn.text() === text);

    await findButton('新增应用').trigger('click');
    expect(wrapper.vm.showCreateModal).toBe(true);

    const moveButton = findButton('移动');
    expect(moveButton.attributes('disabled')).toBeDefined();

    wrapper.vm.selectedIds = [1];
    await nextTick();
    expect(findButton('移动').attributes('disabled')).toBeUndefined();

    await findButton('移动').trigger('click');
    expect(wrapper.vm.showMoveModal).toBe(true);
  });

  it('shows error and loading banners from composable state', async () => {
    const { wrapper, mock } = await mountComponent();
    expect(wrapper.find('.error-message').exists()).toBe(false);
    expect(wrapper.find('.loading').exists()).toBe(false);

    mock.state.error.value = '接口异常';
    mock.state.loading.value = true;
    await nextTick();

    expect(wrapper.find('.error-message').text()).toBe('接口异常');
    expect(wrapper.find('.loading').text()).toBe('加载中...');
  });

  it('onEditSelectedGroup requires a valid selected group', async () => {
    const { wrapper } = await mountComponent();

    wrapper.vm.selectedGroupId = 999;
    await wrapper.vm.onEditSelectedGroup();
    expect(toastMocks.showInfo).toHaveBeenCalledWith('未选择有效分组');

    wrapper.vm.selectedGroupId = 2;
    await wrapper.vm.onEditSelectedGroup();
    expect(wrapper.vm.groupModalMode).toBe('edit');
    expect(wrapper.vm.editingGroup).toEqual({ id: 2, name: '工作' });
    expect(wrapper.vm.showGroupModal).toBe(true);
  });

  it('onDeleteSelectedGroup respects confirm and switches back on success', async () => {
    const { wrapper, mock } = await mountComponent();
    wrapper.vm.selectedGroupId = 2;
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    await wrapper.vm.onDeleteSelectedGroup();
    expect(mock.fns.deleteGroup).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    await wrapper.vm.onDeleteSelectedGroup();
    expect(mock.fns.deleteGroup).toHaveBeenCalledWith(2);
    await flushPromises();
    expect(wrapper.vm.selectedGroupId).toBe('');
    expect(mock.fns.fetchApps).toHaveBeenLastCalledWith(
      { groupId: null },
      true
    );
    expect(toastMocks.showSuccess).toHaveBeenCalledWith('分组已删除');
  });

  it('surfaces deleteGroup failures as error toast', async () => {
    const { wrapper, mock } = await mountComponent();
    wrapper.vm.selectedGroupId = 2;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mock.fns.deleteGroup.mockRejectedValueOnce(new Error('分组下仍有壁纸'));

    await wrapper.vm.onDeleteSelectedGroup();

    expect(toastMocks.showError).toHaveBeenCalledWith('分组下仍有壁纸');
    expect(wrapper.vm.selectedGroupId).toBe(2);
  });

  it('prevPage guards first page and reloads otherwise', async () => {
    const { wrapper, mock } = await mountComponent();
    const mountCalls = mock.fns.fetchApps.mock.calls.length;

    await wrapper.vm.prevPage();
    expect(mock.fns.fetchApps).toHaveBeenCalledTimes(mountCalls);

    mock.state.page.value = 2;
    await wrapper.vm.prevPage();
    expect(mock.state.page.value).toBe(1);
    expect(mock.fns.fetchApps).toHaveBeenLastCalledWith(
      { groupId: null },
      true
    );
  });

  it('nextPage guards last page and reloads otherwise', async () => {
    const { wrapper, mock } = await mountComponent();
    mock.state.total.value = 45;
    mock.state.limit.value = 20;

    await wrapper.vm.nextPage();
    expect(mock.state.page.value).toBe(2);

    mock.state.page.value = 3;
    mock.fns.fetchApps.mockClear();
    await wrapper.vm.nextPage();
    expect(mock.fns.fetchApps).not.toHaveBeenCalled();
  });

  it('onLimitChange resets page and applies new limit', async () => {
    const { wrapper, mock } = await mountComponent();
    mock.state.page.value = 3;

    await wrapper.vm.onLimitChange(50);

    expect(mock.state.page.value).toBe(1);
    expect(mock.fns.setLimit).toHaveBeenCalledWith(50);
    expect(mock.state.limit.value).toBe(50);
    expect(mock.fns.fetchApps).toHaveBeenLastCalledWith(
      { groupId: null },
      true
    );
  });

  it('toggle visible/autostart reload list on success', async () => {
    const { wrapper, mock } = await mountComponent();
    const app = { id: 1 };

    await wrapper.vm.onToggleVisible(app, true);
    expect(mock.fns.setVisible).toHaveBeenCalledWith(1, true);
    expect(mock.fns.fetchApps).toHaveBeenLastCalledWith(
      { groupId: null },
      true
    );

    await wrapper.vm.onToggleAutostart(app, false);
    expect(mock.fns.setAutostart).toHaveBeenCalledWith(1, false);
    expect(mock.fns.fetchApps).toHaveBeenLastCalledWith(
      { groupId: null },
      true
    );
  });

  it('toggle failures surface fallback error messages', async () => {
    const { wrapper, mock } = await mountComponent();
    mock.fns.setVisible.mockRejectedValueOnce(new Error('接口错误'));
    await wrapper.vm.onToggleVisible({ id: 1 }, true);
    expect(toastMocks.showError).toHaveBeenCalledWith('接口错误');

    mock.fns.setAutostart.mockRejectedValueOnce(undefined);
    await wrapper.vm.onToggleAutostart({ id: 1 }, true);
    expect(toastMocks.showError).toHaveBeenCalledWith('设置自启动失败');
  });

  it('remove failure keeps selection and shows error toast', async () => {
    const { wrapper, mock } = await mountComponent();
    wrapper.vm.selectedIds = [1, 2];
    mock.fns.deleteApp.mockRejectedValueOnce(new Error('删除失败'));
    const mountCalls = mock.fns.fetchApps.mock.calls.length;

    await wrapper.vm.remove(1);

    expect(toastMocks.showError).toHaveBeenCalledWith('删除失败');
    expect(wrapper.vm.selectedIds).toEqual([1, 2]);
    expect(mock.fns.fetchApps).toHaveBeenCalledTimes(mountCalls);
  });

  it('submitGroup trims names and supports create/edit modes', async () => {
    const { wrapper, mock } = await mountComponent();

    await wrapper.vm.submitGroup({ name: '  新组  ' });
    expect(mock.fns.createGroup).toHaveBeenCalledWith({ name: '新组' });
    expect(wrapper.vm.showGroupModal).toBe(false);
    expect(toastMocks.showSuccess).toHaveBeenLastCalledWith('分组已创建');

    wrapper.vm.groupModalMode = 'edit';
    wrapper.vm.editingGroup = { id: 2, name: '工作' };
    await wrapper.vm.submitGroup({ name: '新名' });
    expect(mock.fns.updateGroup).toHaveBeenCalledWith(2, { name: '新名' });
    expect(toastMocks.showSuccess).toHaveBeenLastCalledWith('分组已更新');
  });

  it('submitGroup failures keep the modal open and show error toast', async () => {
    const { wrapper, mock } = await mountComponent();
    mock.fns.createGroup.mockRejectedValueOnce(new Error('名称重复'));

    // failure path keeps modal state, simulate it was open
    wrapper.vm.showGroupModal = true;
    await wrapper.vm.submitGroup({ name: '新组' });

    expect(toastMocks.showError).toHaveBeenCalledWith('名称重复');
    expect(wrapper.vm.showGroupModal).toBe(true);
  });

  it('submitMove validates selection and target group before moving', async () => {
    const { wrapper, mock } = await mountComponent();

    await wrapper.vm.submitMove(2);
    expect(toastMocks.showInfo).toHaveBeenLastCalledWith('请选择要移动的应用');
    expect(mock.fns.moveApps).not.toHaveBeenCalled();

    wrapper.vm.selectedIds = [1, '2'];
    await wrapper.vm.submitMove('abc');
    expect(toastMocks.showInfo).toHaveBeenLastCalledWith('目标分组无效');
    expect(mock.fns.moveApps).not.toHaveBeenCalled();

    await wrapper.vm.submitMove('2');
    expect(mock.fns.moveApps).toHaveBeenCalledWith([1, 2], 2);
    expect(wrapper.vm.selectedIds).toEqual([]);
    expect(wrapper.vm.showMoveModal).toBe(false);
    expect(toastMocks.showSuccess).toHaveBeenCalledWith('应用已移动');
  });

  it('submitMove failures surface error toast', async () => {
    const { wrapper, mock } = await mountComponent();
    wrapper.vm.selectedIds = [1];
    wrapper.vm.showMoveModal = true;
    mock.fns.moveApps.mockRejectedValueOnce(new Error('移动失败'));

    await wrapper.vm.submitMove(2);

    expect(toastMocks.showError).toHaveBeenCalledWith('移动失败');
    expect(wrapper.vm.showMoveModal).toBe(true);
    expect(wrapper.vm.selectedIds).toEqual([1]);
  });

  it('submitCreate closes modal, reloads and reports failures', async () => {
    const { wrapper, mock } = await mountComponent();
    const payload = { name: 'App X', slug: 'app-x', url: 'https://x.dev' };

    await wrapper.vm.submitCreate(payload);
    expect(mock.fns.createApp).toHaveBeenCalledWith(payload);
    expect(wrapper.vm.showCreateModal).toBe(false);
    expect(toastMocks.showSuccess).toHaveBeenLastCalledWith('应用已创建');

    // failure path keeps modal state, simulate it was open
    wrapper.vm.showCreateModal = true;
    mock.fns.createApp.mockRejectedValueOnce(new Error('slug 已占用'));
    await wrapper.vm.submitCreate(payload);
    expect(toastMocks.showError).toHaveBeenLastCalledWith('slug 已占用');
    expect(wrapper.vm.showCreateModal).toBe(true);
  });

  it('submitEdit requires editingApp then updates and reloads', async () => {
    const { wrapper, mock } = await mountComponent();

    await wrapper.vm.submitEdit({ name: '改名' });
    expect(toastMocks.showInfo).toHaveBeenCalledWith('无法确定要编辑的应用');
    expect(mock.fns.updateApp).not.toHaveBeenCalled();

    wrapper.vm.onEdit({ id: 1, name: 'App One' });
    expect(wrapper.vm.showEditModal).toBe(true);

    await wrapper.vm.submitEdit({ name: '改名' });
    expect(mock.fns.updateApp).toHaveBeenCalledWith(1, { name: '改名' });
    expect(wrapper.vm.showEditModal).toBe(false);
    expect(wrapper.vm.editingApp).toBeNull();
    expect(toastMocks.showSuccess).toHaveBeenLastCalledWith('应用已更新');
  });

  it('submitEdit failures surface error toast and keep modal state', async () => {
    const { wrapper, mock } = await mountComponent();
    wrapper.vm.onEdit({ id: 1, name: 'App One' });
    mock.fns.updateApp.mockRejectedValueOnce(new Error('更新失败'));

    await wrapper.vm.submitEdit({ name: '改名' });

    expect(toastMocks.showError).toHaveBeenCalledWith('更新失败');
    expect(wrapper.vm.showEditModal).toBe(true);
    expect(wrapper.vm.editingApp).toEqual({ id: 1, name: 'App One' });
  });
});

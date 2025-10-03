import { describe, it, expect, beforeEach, vi } from 'vitest';
import { nextTick } from 'vue';
import { shallowMount, flushPromises } from '@vue/test-utils';
import AppManagement from '@/views/AppManagement.vue';

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

vi.mock('@/composables/useApps.js', () => {
  const { ref } = require('vue');

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
      ensureAsync(mock.fns.fetchApps);
      ensureAsync(mock.fns.fetchGroups);
      ensureAsync(mock.fns.deleteApp);
      ensureAsync(mock.fns.setVisible);
      ensureAsync(mock.fns.setAutostart);
      ensureAsync(mock.fns.createApp);
      ensureAsync(mock.fns.createGroup);
      ensureAsync(mock.fns.updateGroup);
      ensureAsync(mock.fns.deleteGroup);
      ensureAsync(mock.fns.moveApps);
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

  const wrapper = shallowMount(AppManagement, {
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
    mock.fns.deleteApp.mockResolvedValue(true);

    await wrapper.vm.remove(1);
    await nextTick();

    expect(mock.fns.deleteApp).toHaveBeenCalledWith(1);
    expect(mock.fns.fetchApps).toHaveBeenCalledWith({ groupId: null }, true);
    expect(wrapper.vm.selectedIds).toEqual([2]);
  });
});

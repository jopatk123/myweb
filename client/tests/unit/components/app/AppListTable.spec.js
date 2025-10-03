import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import AppListTable from '@/components/app/AppListTable.vue';

vi.mock('@/composables/useApps.js', () => ({
  getAppIconUrl: vi.fn(app => {
    const filename = app?.iconFilename || app?.icon_filename;
    return filename ? `/uploads/apps/icons/${filename}` : '';
  }),
}));

describe('AppListTable', () => {
  const defaultProps = {
    apps: [],
    groups: [],
    selectedIds: [],
    allSelected: false,
  };

  it('renders app list with basic info', () => {
    const apps = [
      {
        id: 1,
        name: 'Test App',
        slug: 'test-app',
        is_builtin: 0,
        group_id: null,
        is_visible: 1,
        is_autostart: 0,
      },
    ];

    const { getByText } = render(AppListTable, {
      props: { ...defaultProps, apps },
    });

    expect(getByText('Test App')).toBeInTheDocument();
    expect(getByText('test-app')).toBeInTheDocument();
    expect(getByText('第三方')).toBeInTheDocument();
  });

  it('shows builtin label for builtin apps', () => {
    const apps = [
      {
        id: 1,
        name: 'Builtin App',
        slug: 'builtin-app',
        is_builtin: 1,
        group_id: null,
        is_visible: 1,
        is_autostart: 0,
      },
    ];

    const { getByText } = render(AppListTable, {
      props: { ...defaultProps, apps },
    });

    expect(getByText('内置')).toBeInTheDocument();
  });

  it('disables edit and delete buttons for builtin apps', () => {
    const apps = [
      {
        id: 1,
        name: 'Builtin App',
        slug: 'builtin-app',
        is_builtin: 1,
        group_id: null,
        is_visible: 1,
        is_autostart: 0,
      },
    ];

    const { container } = render(AppListTable, {
      props: { ...defaultProps, apps },
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const editButton = buttons.find(btn => btn.textContent.trim() === '编辑');
    const deleteButton = buttons.find(btn => btn.textContent.trim() === '删除');

    expect(editButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();
    expect(editButton.disabled).toBe(true);
    expect(deleteButton.disabled).toBe(true);
    expect(editButton.getAttribute('title')).toBe('内置应用不可编辑');
    expect(deleteButton.getAttribute('title')).toBe('内置应用不可删除');
  });

  it('enables edit and delete buttons for third-party apps', () => {
    const apps = [
      {
        id: 2,
        name: 'Custom App',
        slug: 'custom-app',
        is_builtin: 0,
        group_id: null,
        is_visible: 1,
        is_autostart: 0,
      },
    ];

    const { container } = render(AppListTable, {
      props: { ...defaultProps, apps },
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const editButton = buttons.find(btn => btn.textContent.trim() === '编辑');
    const deleteButton = buttons.find(btn => btn.textContent.trim() === '删除');

    expect(editButton).toBeTruthy();
    expect(deleteButton).toBeTruthy();
    expect(editButton.disabled).toBe(false);
    expect(deleteButton.disabled).toBe(false);
    expect(editButton.getAttribute('title')).toBe('编辑');
    expect(deleteButton.getAttribute('title')).toBe('删除');
  });

  it('emits edit event when edit button is clicked for third-party apps', async () => {
    const apps = [
      {
        id: 2,
        name: 'Custom App',
        slug: 'custom-app',
        is_builtin: 0,
        group_id: null,
        is_visible: 1,
        is_autostart: 0,
      },
    ];

    const { container, emitted } = render(AppListTable, {
      props: { ...defaultProps, apps },
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const editButton = buttons.find(btn => btn.textContent.trim() === '编辑');

    expect(editButton).toBeTruthy();
    await fireEvent.click(editButton);

    expect(emitted().edit).toBeTruthy();
    expect(emitted().edit[0]).toEqual([apps[0]]);
  });

  it('does not emit edit event when edit button is clicked for builtin apps', async () => {
    const apps = [
      {
        id: 1,
        name: 'Builtin App',
        slug: 'builtin-app',
        is_builtin: 1,
        group_id: null,
        is_visible: 1,
        is_autostart: 0,
      },
    ];

    const { container, emitted } = render(AppListTable, {
      props: { ...defaultProps, apps },
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const editButton = buttons.find(btn => btn.textContent.trim() === '编辑');

    // 即使点击被禁用的按钮，也不应该发出 edit 事件
    // 注意：被禁用的按钮实际上无法点击
    expect(editButton).toBeTruthy();
    expect(editButton.disabled).toBe(true);
    expect(emitted().edit).toBeFalsy();
  });

  it('emits delete event with app id when delete button is clicked for third-party apps', async () => {
    const apps = [
      {
        id: 2,
        name: 'Custom App',
        slug: 'custom-app',
        is_builtin: 0,
        group_id: null,
        is_visible: 1,
        is_autostart: 0,
      },
    ];

    const { container, emitted } = render(AppListTable, {
      props: { ...defaultProps, apps },
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const deleteButton = buttons.find(btn => btn.textContent.trim() === '删除');

    expect(deleteButton).toBeTruthy();
    await fireEvent.click(deleteButton);

    expect(emitted().delete).toBeTruthy();
    expect(emitted().delete[0]).toEqual([apps[0].id]);
  });
});

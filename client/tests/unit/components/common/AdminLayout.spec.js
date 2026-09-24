import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import AdminLayout from '@/components/common/AdminLayout.vue';

vi.mock('vue-router', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRoute: () => ({ name: 'WallpaperManagement' }),
  };
});

const RouterLinkStub = {
  name: 'RouterLinkStub',
  props: ['to'],
  template: '<a :data-to="to" @click="$emit(\'click\', $event)"><slot /></a>',
};

const renderLayout = (props = {}) =>
  render(AdminLayout, {
    props: { siderVisible: false, ...props },
    slots: {
      default: '<p data-testid="page">页面内容</p>',
      'module-sider': '<div data-testid="module-sider">模块侧栏</div>',
    },
    global: {
      stubs: {
        'router-link': RouterLinkStub,
      },
    },
  });

describe('common/AdminLayout', () => {
  it('renders slots and hides the sider on desktop-large collapsed state', () => {
    const { getByTestId, getByLabelText, container } = renderLayout();

    expect(getByTestId('page')).toBeInTheDocument();
    expect(getByTestId('module-sider')).toBeInTheDocument();
    expect(getByLabelText('打开管理后台导航')).toBeInTheDocument();
    expect(
      container.querySelector('.global-sider').getAttribute('aria-hidden')
    ).toBe('true');
  });

  it('emits update:siderVisible true from the toggle button', async () => {
    const { getByLabelText, emitted } = renderLayout();

    await fireEvent.click(getByLabelText('打开管理后台导航'));

    expect(emitted()['update:siderVisible'][0][0]).toBe(true);
  });

  it('shows the overlay and close control when expanded', () => {
    const { getByLabelText, queryByLabelText } = renderLayout({
      siderVisible: true,
    });

    expect(queryByLabelText('打开管理后台导航')).toBeNull();
    expect(getByLabelText('关闭管理后台导航')).toBeInTheDocument();
  });

  it('emits update:siderVisible false from overlay and close button', async () => {
    const { getByLabelText, container, emitted } = renderLayout({
      siderVisible: true,
    });

    await fireEvent.click(getByLabelText('关闭管理后台导航'));
    expect(emitted()['update:siderVisible'][0][0]).toBe(false);

    await fireEvent.click(container.querySelector('.global-sider-overlay'));
    expect(emitted()['update:siderVisible'][1][0]).toBe(false);
  });

  it('marks the active menu item based on the current route', () => {
    const { getByText } = renderLayout();

    expect(getByText('壁纸管理')).toHaveClass('active');
    expect(getByText('应用管理')).not.toHaveClass('active');
    expect(getByText('文件管理')).not.toHaveClass('active');
  });

  it('closes the sider on navigation in narrow viewports', async () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal('matchMedia', matchMedia);

    const { getByText, emitted } = renderLayout();
    await fireEvent.click(getByText('应用管理'));

    expect(matchMedia).toHaveBeenCalledWith('(max-width: 1024px)');
    expect(emitted()['update:siderVisible'][0][0]).toBe(false);
  });

  it('keeps the sider open on navigation in wide viewports', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

    const { getByText, emitted } = renderLayout();
    await fireEvent.click(getByText('应用管理'));

    expect(emitted()['update:siderVisible']).toBeFalsy();
  });
});

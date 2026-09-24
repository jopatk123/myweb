import { describe, it, expect, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { render, fireEvent } from '@testing-library/vue';
import ContextMenu from '@/components/common/ContextMenu.vue';

const items = [
  { key: 'rename', label: '重命名' },
  { key: 'remove', label: '删除', danger: true, disabled: true },
];

const renderMenu = (props = {}) =>
  render(ContextMenu, {
    props: { modelValue: true, x: 10, y: 10, items, ...props },
  });

describe('common/ContextMenu', () => {
  beforeEach(() => {
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  it('renders nothing when closed', () => {
    const { container } = renderMenu({ modelValue: false });
    expect(container.querySelector('.ctx-root')).toBeNull();
  });

  it('renders menu items with their state classes', () => {
    const { getByRole, getByText } = renderMenu();

    expect(getByRole('menu')).toBeInTheDocument();
    expect(getByRole('menuitem', { name: '重命名' })).not.toHaveClass(
      'disabled'
    );
    expect(getByText('删除')).toHaveClass('danger', 'disabled');
  });

  it('emits select with the key and closes for enabled items', async () => {
    const { getByText, emitted } = renderMenu();

    await fireEvent.click(getByText('重命名'));

    expect(emitted().select[0][0]).toBe('rename');
    expect(emitted()['update:modelValue'][0][0]).toBe(false);
  });

  it('ignores clicks on disabled items', async () => {
    const { getByText, emitted } = renderMenu();

    await fireEvent.click(getByText('删除'));

    expect(emitted().select).toBeFalsy();
    expect(emitted()['update:modelValue']).toBeFalsy();
  });

  it('closes on Escape', async () => {
    const { emitted } = renderMenu();

    // 监听器挂在 window 上，事件必须能冒泡到 window
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    await nextTick();

    expect(emitted()['update:modelValue'][0][0]).toBe(false);
  });

  it('closes when clicking outside the menu', async () => {
    const { emitted, unmount } = renderMenu({
      attachTo: document.body,
    });
    // 打开瞬间的点击会被忽略，等待保护窗口过去
    await new Promise(resolve => setTimeout(resolve, 60));

    fireEvent.click(document.body);
    await nextTick();

    expect(emitted()['update:modelValue']).toBeTruthy();
    expect(emitted()['update:modelValue'][0][0]).toBe(false);
    unmount();
  });

  it('stays open when clicking inside the menu', async () => {
    const { container, emitted, unmount } = renderMenu({
      attachTo: document.body,
    });
    await new Promise(resolve => setTimeout(resolve, 60));

    fireEvent.click(container.querySelector('.ctx-menu'));
    await nextTick();

    expect(emitted()['update:modelValue']).toBeFalsy();
    unmount();
  });

  it('clamps the menu position to stay inside the viewport', async () => {
    const { container } = renderMenu({ x: 5000, y: -50 });
    await nextTick();

    const menu = container.querySelector('.ctx-menu');
    // jsdom 视口 1024x768，菜单宽度回退为 160，右边界 = 1024-160-8
    expect(menu.style.left).toBe('856px');
    expect(menu.style.top).toBe('8px');
  });

  it('keeps the clamped position when the window resizes', async () => {
    const { container } = renderMenu({ x: 5000, y: 500 });
    await nextTick();

    window.dispatchEvent(new Event('resize'));
    await nextTick();

    const menu = container.querySelector('.ctx-menu');
    expect(menu.style.left).toBe('856px');
    expect(menu.style.top).toBe('500px');
  });
});

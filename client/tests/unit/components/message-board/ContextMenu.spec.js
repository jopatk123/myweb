import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import ContextMenu from '@/components/message-board/ContextMenu.vue';

describe('ContextMenu', () => {
  it('renders nothing while hidden', () => {
    const { container } = render(ContextMenu, { props: { visible: false } });
    expect(container.querySelector('.context-menu')).toBeNull();
  });

  it('positions the menu at the given coordinates when visible', () => {
    const { container } = render(ContextMenu, {
      props: { visible: true, position: { x: 120, y: 80 } },
    });

    const menu = container.querySelector('.context-menu');
    expect(menu).not.toBeNull();
    expect(menu.style.left).toBe('120px');
    expect(menu.style.top).toBe('80px');
  });

  it('emits view / save actions from the menu items', async () => {
    const { getByText, emitted } = render(ContextMenu, {
      props: { visible: true },
    });

    await fireEvent.click(getByText('查看图片'));
    await fireEvent.click(getByText('保存图片'));

    expect(emitted().action[0][0]).toBe('view');
    expect(emitted().action[1][0]).toBe('save');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { fireEvent } from '@testing-library/vue';
import MessageBoardWindow from '@/components/message-board/MessageBoardWindow.vue';

vi.mock('@/components/message-board/MessageBoard.vue', () => ({
  default: {
    name: 'MessageBoardStub',
    template: '<div class="message-board-stub" />',
  },
}));

describe('MessageBoardWindow', () => {
  it('renders the message board as its only content', () => {
    const wrapper = mount(MessageBoardWindow);
    expect(wrapper.find('.message-board-stub').exists()).toBe(true);
    wrapper.unmount();
  });

  it('stops context-menu events from bubbling out of the window', async () => {
    const wrapper = mount(MessageBoardWindow, { attachTo: document.body });
    const docListener = vi.fn();
    document.addEventListener('contextmenu', docListener);

    await fireEvent.contextMenu(wrapper.element);

    expect(docListener).not.toHaveBeenCalled();
    document.removeEventListener('contextmenu', docListener);
    wrapper.unmount();
  });
});

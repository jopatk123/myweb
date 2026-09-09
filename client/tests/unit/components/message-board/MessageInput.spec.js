import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import MessageInput from '@/components/message-board/MessageInput.vue';

vi.mock('@/composables/useGlobalToast.js', () => ({
  useGlobalToast: () => ({
    showError: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

describe('MessageInput', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderInput = (props = {}) =>
    render(MessageInput, {
      props: {
        sending: false,
        sendSuccessToken: 0,
        ...props,
      },
    });

  const typeAndGetTextarea = async view => {
    const textarea = view.getByPlaceholderText('输入留言，可粘贴图片');
    await fireEvent.update(textarea, '你好世界');
    return textarea;
  };

  it('does not send when pressing Enter alone', async () => {
    const view = renderInput();
    const textarea = await typeAndGetTextarea(view);

    await fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(view.emitted().send).toBeFalsy();
  });

  it('sends on Ctrl+Enter', async () => {
    const view = renderInput();
    const textarea = await typeAndGetTextarea(view);

    await fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(view.emitted().send).toBeTruthy();
    expect(view.emitted().send[0][0]).toMatchObject({
      text: '你好世界',
      files: [],
    });
  });

  it('sends on Cmd+Enter', async () => {
    const view = renderInput();
    const textarea = await typeAndGetTextarea(view);

    await fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

    expect(view.emitted().send).toBeTruthy();
    expect(view.emitted().send[0][0]).toMatchObject({ text: '你好世界' });
  });

  it('does not send Ctrl+Enter while IME is composing', async () => {
    const view = renderInput();
    const textarea = await typeAndGetTextarea(view);

    await fireEvent.keyDown(textarea, {
      key: 'Enter',
      ctrlKey: true,
      isComposing: true,
    });

    expect(view.emitted().send).toBeFalsy();
  });

  it('does not send Ctrl+Enter for IME keyCode 229', async () => {
    const view = renderInput();
    const textarea = await typeAndGetTextarea(view);

    await fireEvent.keyDown(textarea, {
      key: 'Enter',
      ctrlKey: true,
      keyCode: 229,
    });

    expect(view.emitted().send).toBeFalsy();
  });

  it('does not send when the composer is empty', async () => {
    const view = renderInput();
    const textarea = view.getByPlaceholderText('输入留言，可粘贴图片');

    await fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(view.emitted().send).toBeFalsy();
  });

  it('sends from the send button', async () => {
    const view = renderInput();
    await typeAndGetTextarea(view);

    await fireEvent.click(view.getByRole('button', { name: '发送' }));

    expect(view.emitted().send).toBeTruthy();
  });
});

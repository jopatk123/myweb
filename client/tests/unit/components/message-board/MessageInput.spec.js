import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';
import MessageInput from '@/components/message-board/MessageInput.vue';

const toast = vi.hoisted(() => ({ showError: null, showInfo: null }));
const compressor = vi.hoisted(() => ({ compressImage: null }));

vi.mock('@/composables/useGlobalToast.js', async () => {
  const state = { showError: vi.fn(), showInfo: vi.fn() };
  toast.showError = state.showError;
  toast.showInfo = state.showInfo;
  return { useGlobalToast: () => state };
});

vi.mock('@/utils/imageCompressor.js', async () => {
  const state = { compressImage: vi.fn() };
  compressor.compressImage = state.compressImage;
  return { compressImage: (...args) => state.compressImage(...args) };
});

vi.mock('@/composables/useImageProcessing.js', () => ({
  formatFileSize: vi.fn(size => `${Math.ceil(size / 1024)}KB`),
}));

const pngFile = (name = 'a.png', content = 'x') =>
  new File([content], name, { type: 'image/png' });

const flushAsync = () => new Promise(resolve => setTimeout(resolve, 0));

describe('MessageInput', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    toast.showError.mockClear();
    toast.showInfo.mockClear();
    compressor.compressImage.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:preview'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });
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

  it('disables the send button while a send is in flight', () => {
    const view = renderInput({ sending: true });
    const textarea = view.getByPlaceholderText('输入留言，可粘贴图片');
    fireEvent.update(textarea, '草稿');

    expect(view.getByRole('button', { name: '发送中...' })).toBeDisabled();
  });

  it('shows the live character count', async () => {
    const view = renderInput();
    const textarea = view.getByPlaceholderText('输入留言，可粘贴图片');

    await fireEvent.update(textarea, '1234');

    expect(view.container.querySelector('.char-count')).toHaveTextContent(
      '4/10000'
    );
  });

  it('clears the composer after a successful send token bump', async () => {
    const view = renderInput();
    const textarea = view.getByPlaceholderText('输入留言，可粘贴图片');
    await fireEvent.update(textarea, '会被清空');

    await view.rerender({ sending: false, sendSuccessToken: 1 });

    expect(view.getByPlaceholderText('输入留言，可粘贴图片').value).toBe('');
  });

  it('adds pasted images with a preview and sends the file', async () => {
    const view = renderInput();
    const textarea = view.getByPlaceholderText('输入留言，可粘贴图片');
    const file = pngFile('paste.png', 'image-data');
    await fireEvent.update(textarea, '带图留言');

    await fireEvent.paste(textarea, {
      clipboardData: {
        items: [{ type: 'image/png', getAsFile: () => file }],
      },
    });
    await flushAsync();

    expect(
      view.container.querySelectorAll('.selected-image-item')
    ).toHaveLength(1);
    expect(view.container.querySelector('.image-count')).toHaveTextContent(
      '1/5'
    );

    await fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    expect(view.emitted().send[0][0].files).toEqual([file]);
  });

  it('ignores non-image clipboard content', async () => {
    const view = renderInput();
    const textarea = view.getByPlaceholderText('输入留言，可粘贴图片');

    await fireEvent.paste(textarea, {
      clipboardData: { items: [{ type: 'text/plain', getAsFile: () => null }] },
    });
    await flushAsync();

    expect(view.container.querySelector('.selected-images')).toBeNull();
  });

  it('adds images picked from the file dialog', async () => {
    const view = renderInput();
    const fileInput = view.container.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [pngFile('pick.png', 'p'), new File(['t'], 'note.txt')],
      configurable: true,
    });

    await fireEvent.change(fileInput);
    await flushAsync();

    expect(
      view.container.querySelectorAll('.selected-image-item')
    ).toHaveLength(1);
    expect(fileInput.value).toBe('');
  });

  it('removes a selected image and revokes its object URL', async () => {
    const view = renderInput();
    const fileInput = view.container.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [pngFile('pick.png', 'p')],
      configurable: true,
    });
    await fireEvent.change(fileInput);
    await flushAsync();

    await fireEvent.click(view.getByLabelText('移除图片'));

    expect(view.container.querySelector('.selected-images')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('caps the number of selectable images', async () => {
    const view = renderInput();
    const fileInput = view.container.querySelector('input[type="file"]');
    const file = pngFile('c.png', 'c');

    for (let i = 0; i < 5; i += 1) {
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
      });
      await fireEvent.change(fileInput);
      await flushAsync();
    }
    expect(
      view.container.querySelectorAll('.selected-image-item')
    ).toHaveLength(5);
    expect(view.container.querySelector('.image-count')).toHaveClass(
      'count-warn'
    );

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true,
    });
    await fireEvent.change(fileInput);
    await flushAsync();

    expect(toast.showInfo).toHaveBeenCalledWith('最多只能选择5张图片');
    expect(
      view.container.querySelectorAll('.selected-image-item')
    ).toHaveLength(5);
  });

  it('compresses oversized images and flags them', async () => {
    compressor.compressImage.mockResolvedValue(pngFile('small.png', 'tiny'));
    const view = renderInput();
    const fileInput = view.container.querySelector('input[type="file"]');
    const bigFile = new File(['x'.repeat(6 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });
    Object.defineProperty(fileInput, 'files', { value: [bigFile] });

    await fireEvent.change(fileInput);
    await flushAsync();

    expect(compressor.compressImage).toHaveBeenCalledWith(bigFile);
    expect(
      view.container.querySelector('.compression-badge')
    ).toHaveTextContent('已压缩');
  });

  it('rejects images that are still too large after compression', async () => {
    compressor.compressImage.mockResolvedValue(
      new File(['x'.repeat(6 * 1024 * 1024)], 'still-big.png', {
        type: 'image/png',
      })
    );
    const view = renderInput();
    const fileInput = view.container.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [pngFile('big.png', 'x'.repeat(6 * 1024 * 1024))],
    });

    await fireEvent.change(fileInput);
    await flushAsync();

    expect(toast.showInfo).toHaveBeenCalledWith(
      expect.stringContaining('无法添加')
    );
    expect(view.container.querySelector('.selected-images')).toBeNull();
  });

  it('shows an error toast when compression fails', async () => {
    compressor.compressImage.mockRejectedValue(new Error('boom'));
    const view = renderInput();
    const fileInput = view.container.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [pngFile('big.png', 'x'.repeat(6 * 1024 * 1024))],
    });

    await fireEvent.change(fileInput);
    await flushAsync();

    expect(toast.showError).toHaveBeenCalledWith('图片压缩失败，无法添加');
    expect(view.container.querySelector('.selected-images')).toBeNull();
  });
});

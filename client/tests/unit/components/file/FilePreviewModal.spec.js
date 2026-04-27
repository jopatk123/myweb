import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/vue';

vi.mock('@/api/httpClient.js', () => ({
  buildServerUrl: vi.fn(path => `http://localhost:3000${path}`),
}));

import FilePreviewWindow from '@/components/file/FilePreviewWindow.vue';

function mkFile(overrides = {}) {
  return {
    id: 1,
    originalName: 'test.txt',
    typeCategory: 'text',
    mimeType: 'text/plain',
    fileUrl: '/uploads/files/test.txt',
    ...overrides,
  };
}

function createFetchResponse(body) {
  return {
    ok: true,
    headers: {
      get: () => null,
    },
    text: vi.fn().mockResolvedValue(body),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
  };
}

describe('FilePreviewWindow', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createFetchResponse('')));
  });

  it('renders the current file title', () => {
    const { getByText } = render(FilePreviewWindow, {
      props: { file: mkFile({ originalName: 'report.txt' }) },
    });

    expect(getByText('预览：report.txt')).toBeTruthy();
  });

  it('renders image previews and resolves relative file urls', () => {
    const { container } = render(FilePreviewWindow, {
      props: {
        file: mkFile({
          originalName: 'photo.jpg',
          typeCategory: 'image',
          mimeType: 'image/jpeg',
          fileUrl: '/uploads/photo.jpg',
        }),
      },
    });

    const image = container.querySelector('img');
    expect(image).toBeTruthy();
    expect(image.getAttribute('src')).toBe(
      'http://localhost:3000/uploads/photo.jpg'
    );
  });

  it('renders video previews with controls', () => {
    const { container } = render(FilePreviewWindow, {
      props: {
        file: mkFile({
          originalName: 'clip.mp4',
          typeCategory: 'video',
          mimeType: 'video/mp4',
          fileUrl: '/uploads/clip.mp4',
        }),
      },
    });

    const video = container.querySelector('video');
    expect(video).toBeTruthy();
    expect(video.hasAttribute('controls')).toBe(true);
  });

  it('loads plain text previews asynchronously', async () => {
    fetch.mockResolvedValue(createFetchResponse('hello preview'));

    const { findByText, container } = render(FilePreviewWindow, {
      props: {
        file: mkFile({
          originalName: 'readme.txt',
          typeCategory: 'text',
          mimeType: 'text/plain',
          fileUrl: '/uploads/readme.txt',
        }),
      },
    });

    expect(await findByText('hello preview')).toBeTruthy();
    expect(container.querySelector('pre')).toBeTruthy();
  });

  it('pretty prints json text previews', async () => {
    fetch.mockResolvedValue(createFetchResponse('{"foo":1}'));

    const { container } = render(FilePreviewWindow, {
      props: {
        file: mkFile({
          originalName: 'data.json',
          typeCategory: 'text',
          mimeType: 'application/json',
          fileUrl: '/uploads/data.json',
        }),
      },
    });

    await waitFor(() => {
      expect(container.querySelector('pre')?.textContent).toContain('"foo": 1');
    });
  });

  it('supports snake_case file metadata', () => {
    const { container, getByText } = render(FilePreviewWindow, {
      props: {
        file: {
          id: 2,
          original_name: 'icon.svg',
          type_category: 'image',
          mime_type: 'image/svg+xml',
          file_url: '/uploads/icon.svg',
        },
      },
    });

    expect(getByText('预览：icon.svg')).toBeTruthy();
    expect(container.querySelector('img')).toBeTruthy();
  });

  it('shows the fallback for unsupported file types', () => {
    const { getByText } = render(FilePreviewWindow, {
      props: {
        file: mkFile({
          originalName: 'unknown.xyz',
          typeCategory: 'other',
          mimeType: 'application/octet-stream',
          fileUrl: '/uploads/unknown.xyz',
        }),
      },
    });

    expect(getByText('暂不支持该类型预览')).toBeTruthy();
  });
});

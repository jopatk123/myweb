/**
 * FilePreviewModal.vue 单元测试
 * 覆盖：文件类型判断、预览 URL 生成、模态框开关、文件名解析
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/vue';

// ── Mocks ──────────────────────────────────────────────────────
vi.mock('@/composables/useDraggableModal.js', () => {
  const { ref } = require('vue');
  return {
    useDraggableModal: () => ({
      modalRef: ref(null),
      modalStyle: ref({}),
      onHeaderPointerDown: vi.fn(),
    }),
  };
});

vi.mock('@/api/httpClient.js', () => ({
  buildServerUrl: vi.fn(path => `http://localhost:3000${path}`),
}));

// mammoth / XLSX / dompurify 在非浏览器环境中 mock
vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn().mockResolvedValue({ value: '<p>Word content</p>' }),
  },
}));

vi.mock('dompurify', () => ({
  default: { sanitize: vi.fn(html => html) },
}));

vi.mock('xlsx', () => ({
  default: {
    read: vi.fn().mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} },
    }),
    utils: { sheet_to_html: vi.fn().mockReturnValue('<table></table>') },
  },
}));

import FilePreviewModal from '@/components/file/FilePreviewModal.vue';

// ── 辅助函数 ──────────────────────────────────────────────────
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

// ── 测试套件 ──────────────────────────────────────────────────
describe('FilePreviewModal — 可见性控制', () => {
  it('modelValue=false 时不渲染内容', () => {
    const { queryByText } = render(FilePreviewModal, {
      props: { modelValue: false, file: mkFile() },
    });
    expect(queryByText('预览：')).toBeNull();
  });

  it('modelValue=true 时显示标题和文件名', () => {
    const { getByText } = render(FilePreviewModal, {
      props: { modelValue: true, file: mkFile({ originalName: 'report.txt' }) },
    });
    expect(getByText(/report\.txt/)).toBeTruthy();
  });

  it('点击关闭按钮，触发 update:modelValue false', async () => {
    const { getByText, emitted } = render(FilePreviewModal, {
      props: { modelValue: true, file: mkFile() },
    });

    await fireEvent.click(getByText('✕'));

    expect(emitted()['update:modelValue']).toBeTruthy();
    expect(emitted()['update:modelValue'][0][0]).toBe(false);
  });

  it('点击背景遮罩，触发 update:modelValue false', async () => {
    const { container, emitted } = render(FilePreviewModal, {
      props: { modelValue: true, file: mkFile() },
    });

    const backdrop = container.querySelector('.backdrop');
    await fireEvent.click(backdrop);

    expect(emitted()['update:modelValue']).toBeTruthy();
    expect(emitted()['update:modelValue'][0][0]).toBe(false);
  });
});

describe('FilePreviewModal — 图片预览', () => {
  it('图片文件显示 img 标签', () => {
    const { container } = render(FilePreviewModal, {
      props: {
        modelValue: true,
        file: mkFile({
          originalName: 'photo.jpg',
          typeCategory: 'image',
          mimeType: 'image/jpeg',
          fileUrl: '/uploads/photo.jpg',
        }),
      },
    });
    expect(container.querySelector('img')).toBeTruthy();
  });

  it('通过 mimeType 识别图片（无 typeCategory）', () => {
    const { container } = render(FilePreviewModal, {
      props: {
        modelValue: true,
        file: mkFile({
          originalName: 'photo.webp',
          typeCategory: '',
          mimeType: 'image/webp',
          fileUrl: '/uploads/photo.webp',
        }),
      },
    });
    expect(container.querySelector('img')).toBeTruthy();
  });

  it('通过文件名扩展识别图片（无 mimeType 和 typeCategory）', () => {
    const { container } = render(FilePreviewModal, {
      props: {
        modelValue: true,
        file: mkFile({
          originalName: 'photo.png',
          typeCategory: '',
          mimeType: '',
          fileUrl: '/uploads/photo.png',
        }),
      },
    });
    expect(container.querySelector('img')).toBeTruthy();
  });
});

describe('FilePreviewModal — 视频预览', () => {
  it('视频文件显示 video 标签带 controls', () => {
    const { container } = render(FilePreviewModal, {
      props: {
        modelValue: true,
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
});

describe('FilePreviewModal — 文本预览', () => {
  it('text 类型文件显示 pre 标签', () => {
    const { container } = render(FilePreviewModal, {
      props: {
        modelValue: true,
        file: mkFile({
          originalName: 'readme.txt',
          typeCategory: 'text',
          mimeType: 'text/plain',
        }),
      },
    });
    expect(container.querySelector('pre')).toBeTruthy();
  });

  it('code 类型文件显示 pre 标签', () => {
    const { container } = render(FilePreviewModal, {
      props: {
        modelValue: true,
        file: mkFile({
          originalName: 'index.js',
          typeCategory: 'code',
          mimeType: 'text/javascript',
        }),
      },
    });
    expect(container.querySelector('pre')).toBeTruthy();
  });
});

describe('FilePreviewModal — 不支持类型', () => {
  it('未知文件类型显示不支持提示', () => {
    const { getByText } = render(FilePreviewModal, {
      props: {
        modelValue: true,
        file: mkFile({
          originalName: 'unknown.xyz',
          typeCategory: 'other',
          mimeType: 'application/octet-stream',
        }),
      },
    });
    expect(getByText('暂不支持该类型预览')).toBeTruthy();
  });
});

describe('FilePreviewModal — 文件不存在', () => {
  it('file 为 null 时不崩溃', () => {
    expect(() =>
      render(FilePreviewModal, {
        props: { modelValue: true, file: null },
      })
    ).not.toThrow();
  });
});

describe('FilePreviewModal — previewUrl 生成', () => {
  it('fileUrl 以 / 开头时拼接服务器地址', () => {
    const { container } = render(FilePreviewModal, {
      props: {
        modelValue: true,
        file: mkFile({
          originalName: 'banner.jpg',
          typeCategory: 'image',
          mimeType: 'image/jpeg',
          fileUrl: '/uploads/banner.jpg',
        }),
      },
    });
    const img = container.querySelector('img');
    expect(img.src).toContain('/uploads/banner.jpg');
  });

  it('file 同时携带 file_url 字段时也能正确解析', () => {
    const { container } = render(FilePreviewModal, {
      props: {
        modelValue: true,
        file: {
          id: 2,
          original_name: 'icon.svg',
          type_category: 'image',
          mime_type: 'image/svg+xml',
          file_url: '/uploads/icon.svg',
        },
      },
    });
    expect(container.querySelector('img')).toBeTruthy();
  });
});

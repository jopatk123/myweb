/**
 * useFilePreview composable 单元测试
 * 覆盖：docx → html、docx → text、xlsx → html 以及纯文本预览
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFilePreview } from '@/composables/useFilePreview.js';

// ── Mocks ──────────────────────────────────────────────────────
vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn(),
    extractRawText: vi.fn(),
  },
}));

// xlsx uses `import * as XLSX` — mock as named exports
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: { sheet_to_html: vi.fn() },
}));

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// ── 辅助：构造 File mock ────────────────────────────────────────
function makeFile(content = 'hello') {
  const arrayBuffer = async () => new ArrayBuffer(8);
  const text = async () => content;
  return { arrayBuffer, text };
}

// ── 测试套件 ──────────────────────────────────────────────────
describe('useFilePreview — previewDocx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常情况下返回 HTML 字符串', async () => {
    mammoth.convertToHtml.mockResolvedValue({ value: '<p>Hello</p>' });
    const { previewDocx } = useFilePreview();

    const result = await previewDocx(makeFile());
    expect(result).toBe('<p>Hello</p>');
  });

  it('file 为 null 时返回空字符串', async () => {
    const { previewDocx } = useFilePreview();
    const result = await previewDocx(null);
    expect(result).toBe('');
  });

  it('mammoth 返回空值时返回空字符串', async () => {
    mammoth.convertToHtml.mockResolvedValue({ value: null });
    const { previewDocx } = useFilePreview();
    const result = await previewDocx(makeFile());
    expect(result).toBe('');
  });
});

describe('useFilePreview — extractTextFromDocx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常情况下返回纯文本字符串', async () => {
    mammoth.extractRawText.mockResolvedValue({ value: 'raw content' });
    const { extractTextFromDocx } = useFilePreview();

    const result = await extractTextFromDocx(makeFile());
    expect(result).toBe('raw content');
  });

  it('file 为 null 时返回空字符串', async () => {
    const { extractTextFromDocx } = useFilePreview();
    const result = await extractTextFromDocx(null);
    expect(result).toBe('');
  });
});

describe('useFilePreview — previewXlsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常情况下返回 HTML 表格字符串', async () => {
    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: { A1: { v: 'data' } } },
    });
    vi.mocked(XLSX.utils.sheet_to_html).mockReturnValue(
      '<table><tr><td>data</td></tr></table>'
    );
    const { previewXlsx } = useFilePreview();

    const result = await previewXlsx(makeFile());
    expect(result).toContain('<table>');
  });

  it('file 为 null 时返回空字符串', async () => {
    const { previewXlsx } = useFilePreview();
    const result = await previewXlsx(null);
    expect(result).toBe('');
  });

  it('指定 sheetIndex 时读取正确的 sheet', async () => {
    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: ['Summary', 'Detail'],
      Sheets: {
        Summary: {},
        Detail: { B1: { v: 'detail data' } },
      },
    });
    vi.mocked(XLSX.utils.sheet_to_html).mockReturnValue('<table></table>');
    const { previewXlsx } = useFilePreview();

    await previewXlsx(makeFile(), 1);
    expect(vi.mocked(XLSX.utils.sheet_to_html)).toHaveBeenCalledWith({
      B1: { v: 'detail data' },
    });
  });

  it('Sheet 不存在时返回空字符串', async () => {
    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: [],
      Sheets: {},
    });
    const { previewXlsx } = useFilePreview();
    const result = await previewXlsx(makeFile());
    expect(result).toBe('');
  });
});

describe('useFilePreview — previewGenericText', () => {
  it('返回文件文本内容', async () => {
    const { previewGenericText } = useFilePreview();
    const result = await previewGenericText(makeFile('hello world'));
    expect(result).toBe('hello world');
  });

  it('file 为 null 时返回空字符串', async () => {
    const { previewGenericText } = useFilePreview();
    const result = await previewGenericText(null);
    expect(result).toBe('');
  });

  it('text() 抛出异常时返回空字符串', async () => {
    const badFile = {
      arrayBuffer: async () => new ArrayBuffer(0),
      text: async () => {
        throw new Error('read error');
      },
    };
    const { previewGenericText } = useFilePreview();
    const result = await previewGenericText(badFile);
    expect(result).toBe('');
  });
});

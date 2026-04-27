import { beforeEach, describe, expect, it, vi } from 'vitest';

const previewWindowMocks = vi.hoisted(() => ({
  openFilePreviewWindow: vi.fn(),
}));

vi.mock('@/utils/openFilePreview.js', () => previewWindowMocks);

import { useDesktopFileActions } from '@/composables/useDesktopFileActions.js';

describe('useDesktopFileActions preview detection', () => {
  beforeEach(() => {
    previewWindowMocks.openFilePreviewWindow.mockReset();
  });

  it('allows preview for text/json categories and extensions', () => {
    const { selectedFile, canPreviewSelected } = useDesktopFileActions();

    selectedFile.value = { type_category: 'text' };
    expect(canPreviewSelected.value).toBe(true);

    selectedFile.value = { type_category: 'code' };
    expect(canPreviewSelected.value).toBe(true);

    selectedFile.value = { original_name: 'data.json' };
    expect(canPreviewSelected.value).toBe(true);

    selectedFile.value = { original_name: 'readme.txt' };
    expect(canPreviewSelected.value).toBe(true);

    selectedFile.value = { original_name: 'README.md' };
    expect(canPreviewSelected.value).toBe(true);

    selectedFile.value = { mime_type: 'text/markdown' };
    expect(canPreviewSelected.value).toBe(true);
  });

  it('rejects preview for unsupported extensions', () => {
    const { selectedFile, canPreviewSelected } = useDesktopFileActions();

    selectedFile.value = { original_name: 'archive.zip' };
    expect(canPreviewSelected.value).toBe(false);
  });

  it('opens previewable desktop files in a preview window immediately', () => {
    const { openFile, showConfirm } = useDesktopFileActions();
    const file = { id: 7, __preview: true, original_name: 'readme.md' };

    openFile(file);

    expect(previewWindowMocks.openFilePreviewWindow).toHaveBeenCalledWith(file);
    expect(showConfirm.value).toBe(false);
  });

  it('opens the preview window from the download confirm modal', () => {
    const { handlePreviewFromConfirm } = useDesktopFileActions();
    const file = { id: 9, original_name: 'report.md' };

    handlePreviewFromConfirm(file);

    expect(previewWindowMocks.openFilePreviewWindow).toHaveBeenCalledWith(file);
  });
});

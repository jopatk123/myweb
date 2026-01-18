import { describe, expect, it } from 'vitest';
import { useDesktopFileActions } from '@/composables/useDesktopFileActions.js';

describe('useDesktopFileActions preview detection', () => {
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
  });

  it('rejects preview for unsupported extensions', () => {
    const { selectedFile, canPreviewSelected } = useDesktopFileActions();

    selectedFile.value = { original_name: 'archive.zip' };
    expect(canPreviewSelected.value).toBe(false);
  });
});

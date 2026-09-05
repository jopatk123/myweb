import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';

const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock('@/api/httpClient.js', () => ({
  apiFetch: (...args) => apiFetchMock(...args),
}));

const showErrorMock = vi.hoisted(() => vi.fn());
const showInfoMock = vi.hoisted(() => vi.fn());
vi.mock('@/composables/useGlobalToast.js', () => ({
  useGlobalToast: () => ({
    showError: (...args) => showErrorMock(...args),
    showInfo: (...args) => showInfoMock(...args),
    showSuccess: vi.fn(),
    showWarning: vi.fn(),
  }),
}));

describe('useAppIconSubmit', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    showErrorMock.mockReset();
    showInfoMock.mockReset();
  });

  it('uploads pending file and returns filename', async () => {
    const { useAppIconSubmit } =
      await import('@/composables/useAppIconSubmit.js');
    const { pendingFile, resolveIconFields } = useAppIconSubmit();
    pendingFile.value = new File(['x'], 'a.png', { type: 'image/png' });
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { filename: 'uuid.png' } }),
    });

    const result = await resolveIconFields({});
    expect(result).toEqual({
      iconFilename: 'uuid.png',
      uploadedFilename: 'uuid.png',
    });
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses preset path when no pending file', async () => {
    const { useAppIconSubmit } =
      await import('@/composables/useAppIconSubmit.js');
    const { resolveIconFields } = useAppIconSubmit();
    const result = await resolveIconFields({
      selectedIconPath: '/apps/icons/browser.svg',
    });
    expect(result.presetIcon).toBe('browser.svg');
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('discards unreferenced icon via DELETE', async () => {
    const { useAppIconSubmit } =
      await import('@/composables/useAppIconSubmit.js');
    const { discardUnreferencedIcon } = useAppIconSubmit();
    apiFetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await discardUnreferencedIcon('uuid.png');
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/apps/icons/uuid.png',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('validateTargetUrl rejects non-http urls', async () => {
    const { useAppIconSubmit } =
      await import('@/composables/useAppIconSubmit.js');
    const { validateTargetUrl } = useAppIconSubmit();
    expect(validateTargetUrl('ftp://x')).toBe(false);
    await nextTick();
    expect(showInfoMock).toHaveBeenCalled();
  });
});

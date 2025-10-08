import { describe, expect, it, vi } from 'vitest';
import { useDesktopContextMenu } from '@/composables/useDesktopContextMenu.js';

describe('useDesktopContextMenu', () => {
  it('calls custom onRefresh handler when provided', () => {
    const onRefresh = vi.fn();
    const { handleSelect } = useDesktopContextMenu({ onRefresh });

    handleSelect('refresh');

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('falls back to window.location.reload when no handler is provided', () => {
    const reloadMock = vi.fn();
    const originalLocation = globalThis.location;
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      writable: true,
      value: { reload: reloadMock },
    });

    const { handleSelect } = useDesktopContextMenu();

    handleSelect('refresh');

    expect(reloadMock).toHaveBeenCalledTimes(1);

    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });
});

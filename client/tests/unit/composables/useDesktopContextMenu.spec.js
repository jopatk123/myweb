import { describe, expect, it, vi } from 'vitest';
import { useDesktopContextMenu } from '@/composables/useDesktopContextMenu.js';

describe('useDesktopContextMenu', () => {
  it('reloads the current page when refresh is selected', () => {
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

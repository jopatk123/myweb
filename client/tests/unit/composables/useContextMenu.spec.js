import { describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useContextMenu } from '@/composables/useContextMenu.js';

describe('useContextMenu', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes with hidden menu', () => {
    const { contextMenuVisible, contextMenuPosition, contextMenuTarget } =
      useContextMenu();

    expect(contextMenuVisible.value).toBe(false);
    expect(contextMenuPosition.value).toEqual({ x: 0, y: 0 });
    expect(contextMenuTarget.value).toBeNull();
  });

  describe('showContextMenu', () => {
    it('shows context menu at event coordinates', () => {
      const {
        showContextMenu,
        contextMenuVisible,
        contextMenuPosition,
        contextMenuTarget,
      } = useContextMenu();

      const event = {
        preventDefault: vi.fn(),
        clientX: 150,
        clientY: 200,
      };
      const target = { id: 42, name: '测试文件' };

      showContextMenu(event, target);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(contextMenuVisible.value).toBe(true);
      expect(contextMenuPosition.value).toEqual({ x: 150, y: 200 });
      expect(contextMenuTarget.value).toEqual(target);
    });

    it('registers click listener to close menu', async () => {
      vi.useFakeTimers();
      const addSpy = vi.spyOn(document, 'addEventListener');

      const { showContextMenu } = useContextMenu();

      showContextMenu({ preventDefault: vi.fn(), clientX: 0, clientY: 0 }, {});

      // The click listener is added after setTimeout(0)
      vi.runAllTimers();

      expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('cleans up pending listeners when the scope is disposed', () => {
      vi.useFakeTimers();
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      const scope = effectScope();
      scope.run(() => {
        const { showContextMenu } = useContextMenu();
        showContextMenu(
          { preventDefault: vi.fn(), clientX: 8, clientY: 16 },
          { id: 1 }
        );
      });

      scope.stop();
      vi.runAllTimers();

      expect(addSpy).not.toHaveBeenCalled();
      expect(removeSpy).not.toHaveBeenCalled();
    });
  });

  describe('closeContextMenu', () => {
    it('hides the context menu', () => {
      const { showContextMenu, closeContextMenu, contextMenuVisible } =
        useContextMenu();

      showContextMenu(
        { preventDefault: vi.fn(), clientX: 10, clientY: 20 },
        { id: 1 }
      );
      expect(contextMenuVisible.value).toBe(true);

      closeContextMenu();
      expect(contextMenuVisible.value).toBe(false);
    });
  });

  describe('handleContextMenuAction', () => {
    it('calls the correct handler and closes menu', () => {
      const { showContextMenu, handleContextMenuAction, contextMenuVisible } =
        useContextMenu();

      const target = { id: 1, name: 'file.txt' };
      showContextMenu(
        { preventDefault: vi.fn(), clientX: 0, clientY: 0 },
        target
      );

      const deleteHandler = vi.fn();
      const renameHandler = vi.fn();

      handleContextMenuAction('delete', {
        delete: deleteHandler,
        rename: renameHandler,
      });

      expect(deleteHandler).toHaveBeenCalledWith(target);
      expect(renameHandler).not.toHaveBeenCalled();
      expect(contextMenuVisible.value).toBe(false);
    });

    it('does nothing when no target is set', () => {
      const { handleContextMenuAction } = useContextMenu();
      const handler = vi.fn();

      handleContextMenuAction('delete', { delete: handler });

      expect(handler).not.toHaveBeenCalled();
    });

    it('does nothing when action is not in handlers', () => {
      const { showContextMenu, handleContextMenuAction } = useContextMenu();

      showContextMenu(
        { preventDefault: vi.fn(), clientX: 0, clientY: 0 },
        { id: 1 }
      );

      expect(() =>
        handleContextMenuAction('unknown', { delete: vi.fn() })
      ).not.toThrow();
    });
  });
});

import { ref, onScopeDispose, getCurrentScope } from 'vue';

export function useContextMenu() {
  const contextMenuVisible = ref(false);
  const contextMenuPosition = ref({ x: 0, y: 0 });
  const contextMenuTarget = ref(null);

  let closeMenuTimer = null;
  let closeMenuListener = null;
  let closeMenuAttached = false;

  const removeCloseMenuListener = () => {
    if (closeMenuTimer !== null) {
      clearTimeout(closeMenuTimer);
      closeMenuTimer = null;
    }

    if (closeMenuListener && closeMenuAttached) {
      document.removeEventListener('click', closeMenuListener);
      closeMenuAttached = false;
    }

    closeMenuListener = null;
  };

  if (getCurrentScope()) {
    onScopeDispose(() => {
      removeCloseMenuListener();
    });
  }

  // 显示右键菜单
  const showContextMenu = (event, target) => {
    event.preventDefault();
    removeCloseMenuListener();
    contextMenuPosition.value = { x: event.clientX, y: event.clientY };
    contextMenuTarget.value = target;
    contextMenuVisible.value = true;

    // 点击其他地方关闭菜单
    const closeMenu = () => {
      contextMenuVisible.value = false;
      removeCloseMenuListener();
    };

    closeMenuListener = closeMenu;

    closeMenuTimer = setTimeout(() => {
      closeMenuTimer = null;
      if (typeof document === 'undefined') return;
      closeMenuAttached = true;
      document.addEventListener('click', closeMenuListener);
    }, 0);
  };

  // 关闭右键菜单
  const closeContextMenu = () => {
    contextMenuVisible.value = false;
    removeCloseMenuListener();
  };

  // 处理右键菜单操作
  const handleContextMenuAction = (action, handlers) => {
    if (!contextMenuTarget.value) return;

    const handler = handlers[action];
    if (handler) {
      handler(contextMenuTarget.value);
    }

    contextMenuVisible.value = false;
    removeCloseMenuListener();
  };

  return {
    contextMenuVisible,
    contextMenuPosition,
    contextMenuTarget,
    showContextMenu,
    closeContextMenu,
    handleContextMenuAction,
  };
}

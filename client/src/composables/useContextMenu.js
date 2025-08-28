import { ref } from 'vue';

export function useContextMenu() {
  const contextMenuVisible = ref(false);
  const contextMenuPosition = ref({ x: 0, y: 0 });
  const contextMenuTarget = ref(null);

  // 显示右键菜单
  const showContextMenu = (event, target) => {
    event.preventDefault();
    contextMenuPosition.value = { x: event.clientX, y: event.clientY };
    contextMenuTarget.value = target;
    contextMenuVisible.value = true;

    // 点击其他地方关闭菜单
    const closeMenu = () => {
      contextMenuVisible.value = false;
      document.removeEventListener('click', closeMenu);
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  };

  // 关闭右键菜单
  const closeContextMenu = () => {
    contextMenuVisible.value = false;
  };

  // 处理右键菜单操作
  const handleContextMenuAction = (action, handlers) => {
    if (!contextMenuTarget.value) return;

    const handler = handlers[action];
    if (handler) {
      handler(contextMenuTarget.value);
    }

    contextMenuVisible.value = false;
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

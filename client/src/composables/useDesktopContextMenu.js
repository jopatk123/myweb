import { ref } from 'vue';

/**
 * 管理桌面空白区域的右键菜单
 */
export function useDesktopContextMenu({
  appIconsRef,
  fileIconsRef,
  onRandom,
  onRefresh,
} = {}) {
  const desktopMenu = ref({ visible: false, x: 0, y: 0, items: [] });

  function closeMenu() {
    desktopMenu.value.visible = false;
  }

  function openMenu(event) {
    const icon = event?.target?.closest?.('.icon-item');
    if (icon) return;

    desktopMenu.value = {
      visible: true,
      x: event?.clientX ?? 0,
      y: event?.clientY ?? 0,
      items: [
        { key: 'switch', label: '切换壁纸' },
        { key: 'manage', label: '管理后台' },
        { key: 'refresh', label: '刷新' },
        { key: 'autoArrange', label: '自动排列图标' },
      ],
    };
  }

  function handleSelect(key) {
    if (!key) return;

    switch (key) {
      case 'switch':
        typeof onRandom === 'function' && onRandom();
        break;
      case 'manage':
        window.open('/wallpapers', '_blank', 'noopener');
        break;
      case 'refresh':
        if (typeof onRefresh === 'function') {
          Promise.resolve(onRefresh()).catch(error => {
            console.warn('[useDesktopContextMenu] refresh failed', error);
          });
        } else {
          window.location.reload();
        }
        break;
      case 'autoArrange': {
        const nextCol = appIconsRef?.value?.autoArrange
          ? appIconsRef.value.autoArrange(0)
          : 0;
        Promise.resolve(nextCol)
          .then(column => fileIconsRef?.value?.autoArrange?.(column))
          .catch(error => {
            console.warn('[useDesktopContextMenu] autoArrange failed', error);
          });
        break;
      }
      default:
        break;
    }

    closeMenu();
  }

  return {
    desktopMenu,
    openMenu,
    handleSelect,
    closeMenu,
  };
}

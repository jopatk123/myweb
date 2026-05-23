<template>
  <div
    class="desktop-icons"
    data-group="apps"
    @dragstart.prevent
    @dragover.prevent
    @drop.prevent
  >
    <div
      v-for="app in visibleApps"
      :key="app.id"
      class="icon-item"
      :class="{ selected: selectedId === app.id || selectedIds.has(app.id) }"
      :data-id="app.id"
      @click="onClick(app)"
      @dblclick="onDblClick(app)"
      @mousedown="onMouseDown(app, $event)"
      @contextmenu.prevent.stop="onContextMenu(app, $event)"
      @dragstart.prevent
      @dragover.prevent
      @drop.prevent
      draggable="false"
      :style="getIconStyle(app)"
    >
      <img :src="getIconUrl(app)" class="icon" draggable="false" />
      <div class="label">{{ app.name }}</div>
    </div>

    <ContextMenu
      v-model="menu.visible"
      :x="menu.x"
      :y="menu.y"
      :items="menu.items"
      @select="onMenuSelect"
    />
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { getBuiltinAppPublicIconPath } from '@shared/builtin-apps.js';
  import { useApps } from '@/composables/useApps.js';
  import { getAppComponentBySlug, getAppMetaBySlug } from '@/apps/registry.js';
  import { useWindowManager } from '@/composables/useWindowManager.js';
  import ContextMenu from '@/components/common/ContextMenu.vue';
  import useDesktopIconInteractions from '@/composables/useDesktopIconInteractions.js';

  const { fetchAppsList, getAppIconUrl, setVisible } = useApps();
  const { createWindow, findWindowByApp, setActiveWindow } = useWindowManager();
  const desktopApps = ref([]);

  const visibleApps = computed(() =>
    (desktopApps.value || []).filter(a => a.isVisible ?? a.is_visible)
  );

  const {
    selectedId,
    selectedIds,
    onClick,
    onMouseDown,
    getIconStyle,
    autoArrange,
    setSelectedIds,
  } = useDesktopIconInteractions({
    items: visibleApps,
    storageKey: 'desktopIconPositions',
    defaultStartCol: 0,
    logTag: 'AppIcons',
  });

  async function refreshVisibleApps() {
    desktopApps.value = await fetchAppsList({ visible: true });
  }

  // 优先使用后端提供的图标路径，否则根据 slug 推断本地 public 目录下的图标
  function getIconUrl(app) {
    const filename = app.iconFilename || app.icon_filename;
    if (filename) {
      return getAppIconUrl({ iconFilename: filename });
    }
    const builtinIconPath = getBuiltinAppPublicIconPath(app.slug);
    if (builtinIconPath) {
      return builtinIconPath;
    }
    return '/apps/icons/file-128.svg';
  }

  function open(app) {
    // 自定义APP：若存在 target_url，则新窗口打开
    if (app.targetUrl || app.target_url) {
      const url = app.targetUrl || app.target_url;
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      } catch (error) {
        void error;
      }
    }

    // 检查应用是否已经打开，如果是则激活现有窗口
    const existingWindow = findWindowByApp(app.slug);
    if (existingWindow) {
      setActiveWindow(existingWindow.id);
      return;
    }

    // 内置APP：创建新窗口
    const comp = getAppComponentBySlug(app.slug);
    const meta = getAppMetaBySlug(app.slug);

    if (comp) {
      const preferred = meta?.preferredSize || { width: 520, height: 400 };
      createWindow({
        component: comp,
        title: meta?.name || app.name || '',
        appSlug: app.slug,
        width: preferred.width,
        height: preferred.height,
      });
    }
  }

  function onDblClick(app) {
    open(app);
  }

  // 右键菜单
  const menu = ref({ visible: false, x: 0, y: 0, app: null, items: [] });
  function onContextMenu(app, e) {
    onClick(app);
    menu.value.app = app;
    menu.value.x = e.clientX;
    menu.value.y = e.clientY;
    menu.value.items = [
      { key: 'open', label: '打开' },
      {
        key: 'toggleVisible',
        label: (app.isVisible ?? app.is_visible) ? '隐藏' : '显示',
      },
    ];
    menu.value.visible = true;
  }
  async function onMenuSelect(key) {
    const app = menu.value.app;
    if (!app) return;
    if (key === 'open') {
      open(app);
      return;
    }
    if (key === 'toggleVisible') {
      try {
        await setVisible(app.id, !(app.isVisible ?? app.is_visible));
        await refreshVisibleApps();
      } catch (error) {
        void error;
      }
    }
  }

  defineExpose({ autoArrange, setSelectedIds });

  onMounted(async () => {
    await refreshVisibleApps();
  });
</script>

<style scoped>
  .desktop-icons {
    position: absolute;
    top: 20px;
    left: 20px;
    display: grid;
    grid-template-columns: repeat(auto-fill, 72px);
    gap: 16px;
    z-index: 10;
  }
  .icon-item {
    width: 72px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    cursor: default;
    user-select: none;
  }
  .icon-item.selected .label {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    padding: 2px 4px;
  }
  .icon {
    width: 48px;
    height: 48px;
    object-fit: contain;
    -webkit-user-drag: none;
  }
  .label {
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    font-size: 12px;
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

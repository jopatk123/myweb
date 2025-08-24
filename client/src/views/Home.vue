<template>
  <div
    class="home"
    :class="{ dragover: dragOver }"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    @contextmenu.prevent="onDesktopContextmenu"
    @mousedown="onDesktopMouseDown"
    @mousemove="onDesktopMouseMove"
    @mouseup="onDesktopMouseUp"
  >
    <!-- 动态背景 -->
    <WallpaperBackground :wallpaper="current" />

    <!-- 桌面图标（内部应用） -->
    <AppIcons ref="appIconsRef" />

    <!-- 桌面文件图标（可拖动） -->
    <FileIcons
      ref="fileIconsRef"
      :files="desktopFiles"
      :icons="fileTypeIcons"
      @open="onOpenFile"
    />

    <!-- 文件上传进度条 -->
    <FileUploadProgress :uploading="uploading" :progress="uploadProgress" />

    <!-- 浮动控制按钮 -->
    <div class="floating-controls">
      <button @click="onRandom()" class="control-btn" title="随机切换壁纸">
        🎲
      </button>
      <a
        href="/wallpapers"
        target="_blank"
        rel="noopener"
        class="control-btn"
        title="管理后台"
      >
        🛠️
      </a>
    </div>
    <ConfirmDownloadModal
      v-model="showConfirm"
      :filename="selectedFileName"
      :downloadUrl="selectedDownloadUrl"
      :showPreview="canPreviewSelected"
      :file="selectedFile"
      @preview="onPreviewFromConfirm"
    />

    <FilePreviewModal v-model="showPreview" :file="previewFile" />

    <ContextMenu
      v-model="desktopMenu.visible"
      :x="desktopMenu.x"
      :y="desktopMenu.y"
      :items="desktopMenu.items"
      @select="onDesktopMenuSelect"
    />

    <!-- 矩形选框 -->
    <div
      v-if="selectionRect.visible"
      class="selection-rect"
      :style="{
        left: selectionRect.x + 'px',
        top: selectionRect.y + 'px',
        width: selectionRect.w + 'px',
        height: selectionRect.h + 'px',
      }"
    ></div>

    <!-- 窗口管理器 -->
    <WindowManager />
  </div>
</template>

<script setup>
  import { ref, computed, unref } from 'vue';
  import { useWallpaper } from '@/composables/useWallpaper.js';
  import { useFiles } from '@/composables/useFiles.js';
  import WallpaperBackground from '@/components/wallpaper/WallpaperBackground.vue';
  import AppIcons from '@/components/desktop/AppIcons.vue';
  import FileIcons from '@/components/desktop/FileIcons.vue';
  import WindowManager from '@/components/desktop/WindowManager.vue';
  import FileUploadProgress from '@/components/file/FileUploadProgress.vue';
  import ConfirmDownloadModal from '@/components/file/ConfirmDownloadModal.vue';
  import FilePreviewModal from '@/components/file/FilePreviewModal.vue';
  import FilePreviewWindow from '@/components/file/FilePreviewWindow.vue';
  import { useWindowManager } from '@/composables/useWindowManager.js';
  import ContextMenu from '@/components/common/ContextMenu.vue';

  const { randomWallpaper, ensurePreloaded, fetchCurrentGroup } =
    useWallpaper();
  const current = ref(null);
  const appIconsRef = ref(null);
  const fileIconsRef = ref(null);
  // 文件上传 & 列表
  const {
    items: files,
    fetchList: fetchFiles,
    upload,
    uploading,
    uploadProgress,
    getDownloadUrl,
  } = useFiles();
  const dragOver = ref(false);
  const showConfirm = ref(false);
  const selectedFileName = ref('');
  const selectedDownloadUrl = ref('');
  const selectedFile = ref(null);
  const showPreview = ref(false);
  const previewFile = ref(null);
  const { createWindow, findWindowByApp, setActiveWindow } = useWindowManager();
  const fileTypeIcons = computed(() => ({
    image: '/apps/icons/image-128.svg',
    video: '/apps/icons/video-128.svg',
    word: '/apps/icons/word-128.svg',
    excel: '/apps/icons/excel-128.svg',
    archive: '/apps/icons/archive-128.svg',
    other: '/apps/icons/file-128.svg',
  }));

  // 仅用于桌面显示：过滤掉被标记为小说（novel）的上传文件
  const desktopFiles = computed(() => {
    const list = unref(files) || [];
    return Array.isArray(list)
      ? list.filter(
          f =>
            String(f.type_category || f.typeCategory || '').toLowerCase() !==
            'novel'
        )
      : [];
  });

  // 矩形选框状态
  const selectionRect = ref({
    visible: false,
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    startX: 0,
    startY: 0,
  });
  let isSelecting = false;

  // 页面挂载时触发预加载（保持 2 张缓存）
  fetchCurrentGroup().then(() => {
    // 不阻塞渲染，异步补充缓存
    ensurePreloaded(2).catch(() => {});
  });
  // 初始加载文件列表（用于在桌面显示图标）
  fetchFiles().catch(() => {});

  const onRandom = async () => {
    const w = await randomWallpaper();
    if (w) current.value = w;
    // 点击切换后确保缓存维持在 2 张
    ensurePreloaded(2).catch(() => {});
  };

  function onDragOver() {
    dragOver.value = true;
  }
  function onDragLeave() {
    dragOver.value = false;
  }
  function onDrop(e) {
    dragOver.value = false;
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;
    upload(files).catch(() => {});
  }

  // 供未来在桌面展示文件图标时使用的打开回调
  function onOpenFile(f) {
    if (f && f.__preview) {
      // 允许多开文件预览窗口：每次都创建新窗口并传入文件作为 props
      createWindow({
        component: FilePreviewWindow,
        title: f.originalName || f.original_name || '文件预览',
        appSlug: 'filePreview',
        width: Math.min(1200, window.innerWidth * 0.9),
        height: Math.min(800, window.innerHeight * 0.9),
        props: { file: f },
        storageKey: `previewPos:${f.id}`,
      });

      return;
    }
    selectedFile.value = f;
    selectedFileName.value = f.originalName || f.original_name;
    selectedDownloadUrl.value = getDownloadUrl(f.id);
    showConfirm.value = true;
  }

  const canPreviewSelected = computed(() => {
    const f = selectedFile.value || {};
    const t = String(f.type_category || '');
    if (t === 'image' || t === 'video' || t === 'word' || t === 'excel')
      return true;
    const name = String(
      f.originalName ||
        f.original_name ||
        f.storedName ||
        f.stored_name ||
        f.filePath ||
        f.file_path ||
        ''
    );
    return /(\.(png|jpe?g|gif|bmp|webp|svg|avif|mp4|webm|ogg|ogv|mov|mkv|docx?|xlsx?|xlsm|xlsb))$/i.test(
      name
    );
  });

  function onPreviewFromConfirm(f) {
    // 从确认下载弹窗中打开为独立窗口预览（允许多开）
    if (f) {
      createWindow({
        component: FilePreviewWindow,
        title: f.originalName || f.original_name || '文件预览',
        appSlug: 'filePreview',
        width: Math.min(1200, window.innerWidth * 0.9),
        height: Math.min(800, window.innerHeight * 0.9),
        props: { file: f },
        storageKey: `previewPos:${f.id}`,
      });
      return;
    }

    previewFile.value = f;
    showPreview.value = true;
  }

  // 桌面空白区右键菜单
  const desktopMenu = ref({ visible: false, x: 0, y: 0, items: [] });
  function onDesktopContextmenu(e) {
    // 仅在点击空白处时展示（排除有最近的图标项）
    const icon = e.target.closest('.icon-item');
    if (icon) return; // 交给子组件
    desktopMenu.value.x = e.clientX;
    desktopMenu.value.y = e.clientY;
    desktopMenu.value.items = [
      { key: 'switch', label: '切换壁纸' },
      { key: 'manage', label: '管理后台' },
      { key: 'refresh', label: '刷新' },
      { key: 'autoArrange', label: '自动排列图标' },
    ];
    desktopMenu.value.visible = true;
  }
  function onDesktopMenuSelect(key) {
    if (key === 'switch') return onRandom();
    if (key === 'manage') {
      window.open('/wallpapers', '_blank', 'noopener');
      return;
    }
    if (key === 'refresh') {
      location.reload();
      return;
    }
    if (key === 'autoArrange') {
      // 先排列应用图标，再承接列偏移排列文件图标
      const nextCol = appIconsRef.value?.autoArrange
        ? appIconsRef.value.autoArrange(0)
        : 0;
      Promise.resolve(nextCol)
        .then(col => fileIconsRef.value?.autoArrange?.(col))
        .catch(() => {});
      return;
    }
  }

  // 桌面矩形选框逻辑
  function onDesktopMouseDown(e) {
    // 只在点击空白区域时开始选框（不是图标项）
    if (e.target.closest('.icon-item')) return;

    isSelecting = true;
    selectionRect.value.startX = e.clientX;
    selectionRect.value.startY = e.clientY;
    selectionRect.value.x = e.clientX;
    selectionRect.value.y = e.clientY;
    selectionRect.value.w = 0;
    selectionRect.value.h = 0;
    selectionRect.value.visible = true;
  }

  function onDesktopMouseMove(e) {
    if (!isSelecting || !selectionRect.value.visible) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const startX = selectionRect.value.startX;
    const startY = selectionRect.value.startY;

    // 计算矩形位置和大小
    selectionRect.value.x = Math.min(startX, currentX);
    selectionRect.value.y = Math.min(startY, currentY);
    selectionRect.value.w = Math.abs(currentX - startX);
    selectionRect.value.h = Math.abs(currentY - startY);
  }

  function onDesktopMouseUp(e) {
    if (!isSelecting) return;

    isSelecting = false;

    if (selectionRect.value.visible) {
      // 计算选中的图标
      const selectedIds = getSelectedIconIds();

      // 分发选中状态到子组件
      if (appIconsRef.value?.setSelectedIds) {
        appIconsRef.value.setSelectedIds(selectedIds.apps);
      }
      if (fileIconsRef.value?.setSelectedIds) {
        fileIconsRef.value.setSelectedIds(selectedIds.files);
      }
    }

    // 隐藏选框
    selectionRect.value.visible = false;
  }

  // 计算与选框相交的图标
  function getSelectedIconIds() {
    const rect = selectionRect.value;
    const selectedApps = [];
    const selectedFiles = [];

    // 检查所有图标项
    const iconItems = document.querySelectorAll('.icon-item[data-id]');

    iconItems.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      const id = parseInt(item.getAttribute('data-id'));

      // 检查矩形相交
      if (rectIntersect(rect, itemRect)) {
        // 根据父容器判断是应用图标还是文件图标
        const isAppIcon = item.closest('.desktop-icons')?.style.left === '20px';
        if (isAppIcon) {
          selectedApps.push(id);
        } else {
          selectedFiles.push(id);
        }
      }
    });

    return { apps: selectedApps, files: selectedFiles };
  }

  // 矩形相交检测
  function rectIntersect(rect1, rect2) {
    return !(
      rect1.x + rect1.w < rect2.left ||
      rect2.left + rect2.width < rect1.x ||
      rect1.y + rect1.h < rect2.top ||
      rect2.top + rect2.height < rect1.y
    );
  }
</script>

<style scoped>
  .home {
    position: relative;
    min-height: 100vh;
    width: 100%;
  }

  .home.dragover {
    outline: 2px dashed rgba(255, 255, 255, 0.7);
  }

  .desktop-files {
    position: absolute;
    top: 20px;
    left: 120px;
    display: grid;
    grid-template-columns: repeat(auto-fill, 72px);
    gap: 16px;
    z-index: 2;
  }

  .floating-controls {
    position: fixed;
    bottom: 30px;
    right: 30px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    z-index: 15;
  }

  .control-btn {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    color: white;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .control-btn:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.1);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  /* 矩形选框样式 */
  .selection-rect {
    position: fixed;
    border: 1px solid rgba(0, 123, 255, 0.8);
    background: rgba(0, 123, 255, 0.1);
    z-index: 20;
    pointer-events: none;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .floating-controls {
      bottom: 20px;
      right: 20px;
    }

    .control-btn {
      width: 50px;
      height: 50px;
      font-size: 20px;
    }
  }
</style>

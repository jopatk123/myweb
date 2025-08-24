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
      :files="files"
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
  </div>
</template>

<script setup>
  import { ref, computed } from 'vue';
  import { useWallpaper } from '@/composables/useWallpaper.js';
  import { useFiles } from '@/composables/useFiles.js';
  import WallpaperBackground from '@/components/wallpaper/WallpaperBackground.vue';
  import AppIcons from '@/components/desktop/AppIcons.vue';
  import FileIcons from '@/components/desktop/FileIcons.vue';
  import FileUploadProgress from '@/components/file/FileUploadProgress.vue';
  import ConfirmDownloadModal from '@/components/file/ConfirmDownloadModal.vue';
  import FilePreviewModal from '@/components/file/FilePreviewModal.vue';
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
  const fileTypeIcons = computed(() => ({
    image: '/apps/icons/image-128.svg',
    video: '/apps/icons/video-128.svg',
    word: '/apps/icons/word-128.svg',
    excel: '/apps/icons/excel-128.svg',
    archive: '/apps/icons/archive-128.svg',
    other: '/apps/icons/file-128.svg',
  }));

  // 矩形选框（使用 composable）
  import { useSelectionRect } from '@/composables/useSelectionRect.js';

  // hitTestItems 将使用子组件 refs 来判定哪些 id 被选中
  async function hitTestItems(rect) {
    // Always compute DOM fallback to ensure full coverage, then merge with any
    // component-provided hitTest results (components may have more accurate logic).
    const selectedApps = [];
    const selectedFiles = [];
    const iconItems = Array.from(
      document.querySelectorAll('.icon-item[data-id]')
    );
    const appContainerEl = appIconsRef.value?.$el || null;
    const fileContainerEl = fileIconsRef.value?.$el || null;

    function rectIntersectLocal(r, b) {
      return !(
        r.x + r.w < b.left ||
        b.left + b.width < r.x ||
        r.y + r.h < b.top ||
        b.top + b.height < r.y
      );
    }

    iconItems.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      if (!rectIntersectLocal(rect, itemRect)) return;
      const id = parseInt(item.getAttribute('data-id'));
      if (appContainerEl && appContainerEl.contains(item)) {
        selectedApps.push(id);
        return;
      }
      if (fileContainerEl && fileContainerEl.contains(item)) {
        selectedFiles.push(id);
        return;
      }

      const parent = item.closest('.desktop-icons');
      if (parent) {
        const left = parent.style?.left || '';
        if (left === '20px') selectedApps.push(id);
        else selectedFiles.push(id);
      } else {
        const midX = itemRect.left + itemRect.width / 2;
        if (midX < window.innerWidth / 2) selectedApps.push(id);
        else selectedFiles.push(id);
      }
    });

    // If components provide hitTest, merge their results (prefer unique ids)
    try {
      if (typeof appIconsRef.value?.hitTest === 'function') {
        const appsResult = await appIconsRef.value.hitTest(rect);
        (appsResult || []).forEach(id => {
          if (!selectedApps.includes(id)) selectedApps.push(id);
        });
      }
      if (typeof fileIconsRef.value?.hitTest === 'function') {
        const filesResult = await fileIconsRef.value.hitTest(rect);
        (filesResult || []).forEach(id => {
          if (!selectedFiles.includes(id)) selectedFiles.push(id);
        });
      }
    } catch (err) {
      console.error('component hitTest failed', err);
    }

    return { apps: selectedApps, files: selectedFiles };
  }

  const { selectionRect, onMouseDown, onMouseMove, onMouseUp } =
    useSelectionRect({ hitTestItems });

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
      previewFile.value = f;
      showPreview.value = true;
      return;
    }
    selectedFile.value = f;
    selectedFileName.value = f.originalName || f.original_name;
    selectedDownloadUrl.value = getDownloadUrl(f.id);
    showConfirm.value = true;
  }

  const canPreviewSelected = computed(() => {
    const f = selectedFile.value || {};
    const t = String(f.typeCategory || f.type_category || '');
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
    onMouseDown(e);
  }

  function onDesktopMouseMove(e) {
    onMouseMove(e);
  }

  async function onDesktopMouseUp(e) {
    try {
      const res = await onMouseUp(e);
      if (res) {
        if (appIconsRef.value?.setSelectedIds) {
          appIconsRef.value.setSelectedIds(res.apps || []);
        }
        if (fileIconsRef.value?.setSelectedIds) {
          fileIconsRef.value.setSelectedIds(res.files || []);
        }
      }
    } catch (err) {
      // swallow but log — caller/UX can be improved later
      console.error('hitTestItems error', err);
    }
  }

  // 交由子组件实现 hitTest（已在 useSelectionRect 中调用）
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

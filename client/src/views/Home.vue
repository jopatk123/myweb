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
      @open="openFile"
    />

    <!-- 文件上传进度面板 -->
    <FileUploadProgress
      :uploading="uploading"
      :progress="uploadProgress"
      :uploaded-bytes="uploadedBytes"
      :total-bytes="totalBytes"
      :current-file-name="currentFileName"
      :upload-queue="uploadQueue"
    />

    <!-- 浮动控制按钮 -->
    <FloatingControls @random="onRandom" @message="openMessageBoard" />
    <ConfirmDownloadModal
      v-model="showConfirm"
      :filename="selectedFileName"
      :downloadUrl="selectedDownloadUrl"
      :showPreview="canPreviewSelected"
      :file="selectedFile"
      @preview="handlePreviewFromConfirm"
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
  import { ref, computed, unref, watch } from 'vue';
  import { useWallpaper } from '@/composables/useWallpaper.js';
  import { useFiles } from '@/composables/useFiles.js';
  import WallpaperBackground from '@/components/wallpaper/WallpaperBackground.vue';
  import AppIcons from '@/components/desktop/AppIcons.vue';
  import FileIcons from '@/components/desktop/FileIcons.vue';
  import WindowManager from '@/components/desktop/WindowManager.vue';
  import FileUploadProgress from '@/components/file/FileUploadProgress.vue';
  import ConfirmDownloadModal from '@/components/file/ConfirmDownloadModal.vue';
  import FilePreviewModal from '@/components/file/FilePreviewModal.vue';
  import { openFilePreviewWindow } from '@/composables/filePreview.js';
  import useDesktopSelection from '@/composables/useDesktopSelection.js';
  import { useWindowManager } from '@/composables/useWindowManager.js';
  import useAutostartApps from '@/composables/useAutostartApps.js';
  import { useMessageBoardAutoOpen } from '@/composables/useMessageBoardAutoOpen.js';
  import ContextMenu from '@/components/common/ContextMenu.vue';
  import FloatingControls from '@/components/common/FloatingControls.vue';
  import FilePreviewWindow from '@/components/file/FilePreviewWindow.vue';
  import { useDesktopDropZone } from '@/composables/useDesktopDropZone.js';
  import { useDesktopFileActions } from '@/composables/useDesktopFileActions.js';
  import { useDesktopContextMenu } from '@/composables/useDesktopContextMenu.js';

  const {
    randomWallpaper,
    ensurePreloaded,
    fetchCurrentGroup,
    fetchActiveWallpaper,
    activeWallpaper,
  } = useWallpaper();
  const current = ref(null);
  const LAST_WALLPAPER_STORAGE_KEY = 'desktop:lastWallpaper';

  if (typeof window !== 'undefined') {
    try {
      const cachedWallpaper = window.localStorage?.getItem(
        LAST_WALLPAPER_STORAGE_KEY
      );
      if (cachedWallpaper) {
        current.value = JSON.parse(cachedWallpaper);
      }
    } catch (error) {
      console.warn('[Home] Failed to restore cached wallpaper', error);
    }
  }
  const appIconsRef = ref(null);
  const fileIconsRef = ref(null);

  const {
    items: files,
    fetchList: fetchFiles,
    upload,
    uploading,
    uploadProgress,
    uploadedBytes,
    totalBytes,
    currentFileName,
    uploadQueue,
    getDownloadUrl,
  } = useFiles();

  const onRandom = async () => {
    const wallpaper = await randomWallpaper();
    if (wallpaper) current.value = wallpaper;
    ensurePreloaded(2).catch(() => {});
  };

  watch(
    current,
    wallpaper => {
      if (typeof window === 'undefined') return;
      try {
        if (wallpaper) {
          window.localStorage?.setItem(
            LAST_WALLPAPER_STORAGE_KEY,
            JSON.stringify(wallpaper)
          );
        } else {
          window.localStorage?.removeItem(LAST_WALLPAPER_STORAGE_KEY);
        }
      } catch (error) {
        console.warn('[Home] Failed to persist wallpaper cache', error);
      }
    },
    { deep: false }
  );

  const { dragOver, onDragOver, onDragLeave, onDrop } = useDesktopDropZone({
    upload: filesToUpload => upload(filesToUpload),
    onError: error => {
      console.warn('[Home] Desktop upload failed', error);
    },
  });

  const { createWindow } = useWindowManager();
  const {
    showConfirm,
    selectedFileName,
    selectedDownloadUrl,
    selectedFile,
    showPreview,
    previewFile,
    canPreviewSelected,
    openFile,
    handlePreviewFromConfirm,
  } = useDesktopFileActions({
    getDownloadUrl,
    openFilePreviewWindow,
    createWindow,
    FilePreviewWindow,
  });

  const { manualOpenMessageBoard } = useMessageBoardAutoOpen();
  const openMessageBoard = () => {
    manualOpenMessageBoard();
  };

  const { desktopMenu, openMenu, handleSelect, closeMenu } =
    useDesktopContextMenu({
      appIconsRef,
      fileIconsRef,
      onRandom,
    });

  const {
    selectionRect,
    onMouseDown: selectionOnMouseDown,
    onMouseMove: selectionOnMouseMove,
    onMouseUp: selectionOnMouseUp,
    getSelectedIconIds,
  } = useDesktopSelection();

  useAutostartApps();

  const fileTypeIcons = computed(() => ({
    image: '/apps/icons/image-128.svg',
    video: '/apps/icons/video-128.svg',
    audio: '/apps/icons/audio-128.svg',
    music: '/apps/icons/music-128.svg',
    word: '/apps/icons/word-128.svg',
    excel: '/apps/icons/excel-128.svg',
    ppt: '/apps/icons/ppt-128.svg',
    pdf: '/apps/icons/pdf-128.svg',
    text: '/apps/icons/text-128.svg',
    code: '/apps/icons/code-128.svg',
    archive: '/apps/icons/archive-128.svg',
    novel: '/apps/icons/novel-128.svg',
    other: '/apps/icons/file-128.svg',
  }));

  const desktopFiles = computed(() => {
    const list = unref(files) || [];
    const hiddenCategories = new Set(['novel', 'music']);
    return Array.isArray(list)
      ? list.filter(file => {
          const category = String(file.type_category || file.typeCategory || '')
            .toLowerCase()
            .trim();
          return !hiddenCategories.has(category);
        })
      : [];
  });

  fetchCurrentGroup().then(() => {
    ensurePreloaded(2).catch(() => {});
  });
  fetchActiveWallpaper()
    .then(() => {
      if (!current.value && activeWallpaper.value) {
        current.value = activeWallpaper.value;
      }
    })
    .catch(() => {});
  fetchFiles().catch(() => {});

  function onDesktopContextmenu(event) {
    openMenu(event);
  }

  function onDesktopMenuSelect(key) {
    handleSelect(key);
  }

  function onDesktopMouseDown(event) {
    closeMenu();
    selectionOnMouseDown(event);
  }

  function onDesktopMouseMove(event) {
    selectionOnMouseMove(event);
  }

  function onDesktopMouseUp() {
    if (selectionRect.value.visible) {
      const selectedIds = getSelectedIconIds();
      appIconsRef.value?.setSelectedIds?.(selectedIds.apps);
      fileIconsRef.value?.setSelectedIds?.(selectedIds.files);
    }

    selectionOnMouseUp();
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

  /* 防止浮动控件在点击桌面时显示文本插入光标 */
  .floating-controls,
  .control-btn {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    caret-color: transparent;
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

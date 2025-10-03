import { describe, expect, it, beforeEach, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const filesRef = ref([]);

vi.mock('@/composables/useWallpaper.js', () => {
  const ensurePreloaded = vi.fn().mockResolvedValue();
  const fetchCurrentGroup = vi.fn().mockResolvedValue();
  const randomWallpaper = vi.fn().mockResolvedValue(null);
  return {
    useWallpaper: () => ({
      randomWallpaper,
      ensurePreloaded,
      fetchCurrentGroup,
    }),
  };
});

vi.mock('@/composables/useFiles.js', () => {
  const upload = vi.fn();
  const fetchList = vi.fn().mockResolvedValue();
  const uploading = ref(false);
  const uploadProgress = ref(0);
  const uploadedBytes = ref(0);
  const totalBytes = ref(0);
  const currentFileName = ref('');
  const uploadQueue = ref([]);
  const getDownloadUrl = vi.fn();
  return {
    useFiles: () => ({
      items: filesRef,
      fetchList,
      upload,
      uploading,
      uploadProgress,
      uploadedBytes,
      totalBytes,
      currentFileName,
      uploadQueue,
      getDownloadUrl,
    }),
  };
});

vi.mock('@/composables/filePreview.js', () => ({
  openFilePreviewWindow: vi.fn(),
}));

vi.mock('@/composables/useDesktopSelection.js', () => ({
  default: () => ({
    selectionRect: ref({ visible: false, x: 0, y: 0, w: 0, h: 0 }),
    onMouseDown: vi.fn(),
    onMouseMove: vi.fn(),
    onMouseUp: vi.fn(),
    getSelectedIconIds: vi.fn().mockReturnValue({ apps: [], files: [] }),
  }),
}));

vi.mock('@/composables/useWindowManager.js', () => ({
  useWindowManager: () => ({
    createWindow: vi.fn(),
  }),
}));

vi.mock('@/composables/useAutostartApps.js', () => ({
  default: () => ({
    startAutostartApps: vi.fn(),
  }),
}));

vi.mock('@/composables/useMessageBoardAutoOpen.js', () => ({
  useMessageBoardAutoOpen: () => ({
    manualOpenMessageBoard: vi.fn(),
  }),
}));

vi.mock('@/composables/useDesktopDropZone.js', () => ({
  useDesktopDropZone: () => ({
    dragOver: ref(false),
    onDragOver: vi.fn(),
    onDragLeave: vi.fn(),
    onDrop: vi.fn(),
  }),
}));

vi.mock('@/composables/useDesktopFileActions.js', () => ({
  useDesktopFileActions: () => ({
    showConfirm: ref(false),
    selectedFileName: ref(''),
    selectedDownloadUrl: ref(''),
    selectedFile: ref(null),
    showPreview: ref(false),
    previewFile: ref(null),
    canPreviewSelected: ref(false),
    openFile: vi.fn(),
    handlePreviewFromConfirm: vi.fn(),
    resetConfirmState: vi.fn(),
  }),
}));

vi.mock('@/composables/useDesktopContextMenu.js', () => ({
  useDesktopContextMenu: () => ({
    desktopMenu: {
      visible: false,
      x: 0,
      y: 0,
      items: [],
    },
    openMenu: vi.fn(),
    handleSelect: vi.fn(),
    closeMenu: vi.fn(),
  }),
}));

vi.mock('@/components/wallpaper/WallpaperBackground.vue', () => ({
  default: defineComponent({
    name: 'WallpaperBackgroundStub',
    props: {
      wallpaper: { type: Object, default: null },
    },
    setup: () => () => h('div', { class: 'wallpaper-background-stub' }),
  }),
}));

vi.mock('@/components/desktop/AppIcons.vue', () => ({
  default: defineComponent({
    name: 'AppIconsStub',
    setup: () => () => h('div', { class: 'app-icons-stub' }),
  }),
}));

vi.mock('@/components/desktop/FileIcons.vue', () => ({
  default: defineComponent({
    name: 'FileIconsStub',
    props: {
      files: { type: Array, default: () => [] },
      icons: { type: Object, default: () => ({}) },
    },
    setup(props) {
      return () =>
        h('div', {
          class: 'file-icons-stub',
          'data-count': props.files.length,
        });
    },
  }),
}));

vi.mock('@/components/desktop/WindowManager.vue', () => ({
  default: defineComponent({
    name: 'WindowManagerStub',
    setup: () => () => h('div', { class: 'window-manager-stub' }),
  }),
}));

vi.mock('@/components/file/FileUploadProgress.vue', () => ({
  default: defineComponent({
    name: 'FileUploadProgressStub',
    props: {
      uploading: { type: Boolean, default: false },
    },
    setup: () => () => h('div', { class: 'file-upload-progress-stub' }),
  }),
}));

vi.mock('@/components/file/ConfirmDownloadModal.vue', () => ({
  default: defineComponent({
    name: 'ConfirmDownloadModalStub',
    props: {
      modelValue: { type: Boolean, default: false },
    },
    setup: () => () => h('div', { class: 'confirm-download-modal-stub' }),
  }),
}));

vi.mock('@/components/file/FilePreviewModal.vue', () => ({
  default: defineComponent({
    name: 'FilePreviewModalStub',
    props: {
      modelValue: { type: Boolean, default: false },
    },
    setup: () => () => h('div', { class: 'file-preview-modal-stub' }),
  }),
}));

vi.mock('@/components/common/ContextMenu.vue', () => ({
  default: defineComponent({
    name: 'ContextMenuStub',
    props: {
      modelValue: { type: Boolean, default: false },
    },
    setup: () => () => h('div', { class: 'context-menu-stub' }),
  }),
}));

vi.mock('@/components/common/FloatingControls.vue', () => ({
  default: defineComponent({
    name: 'FloatingControlsStub',
    setup: () => () => h('div', { class: 'floating-controls-stub' }),
  }),
}));

vi.mock('@/components/file/FilePreviewWindow.vue', () => ({
  default: defineComponent({
    name: 'FilePreviewWindowStub',
    setup: () => () => h('div'),
  }),
}));

import Home from '@/views/Home.vue';

describe('Home desktop files filtering', () => {
  beforeEach(() => {
    filesRef.value = [];
  });

  it('excludes music files from desktop listing', async () => {
    filesRef.value = [
      { id: 1, typeCategory: 'music' },
      { id: 2, typeCategory: 'image' },
      { id: 3, type_category: 'novel' },
      { id: 4, typeCategory: 'other' },
    ];

    const wrapper = mount(Home);
    await nextTick();
    await flushPromises();

    const fileIcons = wrapper.findComponent({ name: 'FileIconsStub' });
    expect(fileIcons.exists()).toBe(true);
    expect(fileIcons.props('files').map(file => file.id)).toEqual([2, 4]);

    wrapper.unmount();
  });
});

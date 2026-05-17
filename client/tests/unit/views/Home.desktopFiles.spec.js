import { describe, expect, it, beforeEach, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const filesRef = ref([]);
const homeMocks = vi.hoisted(() => ({
  uploadMock: vi.fn().mockResolvedValue(),
  fetchListMock: vi.fn().mockResolvedValue(),
  getDownloadUrlMock: vi.fn(),
  dropZoneOptions: null,
  appAutoArrangeMock: vi.fn().mockResolvedValue(1),
  fileAutoArrangeMock: vi.fn().mockResolvedValue(),
}));
const wallpaperMocks = vi.hoisted(() => ({
  ensurePreloadedMock: vi.fn().mockResolvedValue(),
  fetchCurrentGroupMock: vi.fn().mockResolvedValue(),
  fetchActiveWallpaperMock: vi.fn().mockResolvedValue(),
  randomWallpaperMock: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/composables/useWallpaper.js', () => {
  return {
    useWallpaper: () => ({
      randomWallpaper: wallpaperMocks.randomWallpaperMock,
      ensurePreloaded: wallpaperMocks.ensurePreloadedMock,
      fetchCurrentGroup: wallpaperMocks.fetchCurrentGroupMock,
      fetchActiveWallpaper: wallpaperMocks.fetchActiveWallpaperMock,
      activeWallpaper: ref(null),
    }),
  };
});

vi.mock('@/composables/useFiles.js', () => {
  const uploading = ref(false);
  const uploadProgress = ref(0);
  const uploadedBytes = ref(0);
  const totalBytes = ref(0);
  const currentFileName = ref('');
  const uploadQueue = ref([]);
  return {
    useFiles: () => ({
      items: filesRef,
      fetchList: homeMocks.fetchListMock,
      upload: homeMocks.uploadMock,
      uploading,
      uploadProgress,
      uploadedBytes,
      totalBytes,
      currentFileName,
      uploadQueue,
      getDownloadUrl: homeMocks.getDownloadUrlMock,
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
  useDesktopDropZone: options => {
    homeMocks.dropZoneOptions = options;
    return {
      dragOver: ref(false),
      onDragOver: vi.fn(),
      onDragLeave: vi.fn(),
      onDrop: vi.fn(),
    };
  },
}));

vi.mock('@/composables/useDesktopFileActions.js', () => ({
  useDesktopFileActions: () => ({
    showConfirm: ref(false),
    selectedFileName: ref(''),
    selectedDownloadUrl: ref(''),
    selectedFile: ref(null),
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
    setup(_props, { expose }) {
      expose({
        autoArrange: (...args) => homeMocks.appAutoArrangeMock(...args),
        setSelectedIds: vi.fn(),
      });
      return () => h('div', { class: 'app-icons-stub' });
    },
  }),
}));

vi.mock('@/components/desktop/FileIcons.vue', () => ({
  default: defineComponent({
    name: 'FileIconsStub',
    props: {
      files: { type: Array, default: () => [] },
      icons: { type: Object, default: () => ({}) },
    },
    setup(props, { expose }) {
      expose({
        autoArrange: (...args) => homeMocks.fileAutoArrangeMock(...args),
        setSelectedIds: vi.fn(),
      });
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
    wallpaperMocks.randomWallpaperMock.mockResolvedValue(null);
    wallpaperMocks.ensurePreloadedMock.mockResolvedValue();
    wallpaperMocks.fetchCurrentGroupMock.mockResolvedValue();
    wallpaperMocks.fetchActiveWallpaperMock.mockResolvedValue();
    wallpaperMocks.randomWallpaperMock.mockClear();
    wallpaperMocks.ensurePreloadedMock.mockClear();
    wallpaperMocks.fetchCurrentGroupMock.mockClear();
    wallpaperMocks.fetchActiveWallpaperMock.mockClear();
    homeMocks.uploadMock.mockResolvedValue();
    homeMocks.fetchListMock.mockResolvedValue();
    homeMocks.getDownloadUrlMock.mockReset();
    homeMocks.dropZoneOptions = null;
    homeMocks.appAutoArrangeMock.mockClear();
    homeMocks.fileAutoArrangeMock.mockClear();
    homeMocks.uploadMock.mockClear();
    homeMocks.fetchListMock.mockClear();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  it('shows all files on desktop listing', async () => {
    filesRef.value = [
      { id: 1, typeCategory: 'audio' },
      { id: 2, typeCategory: 'image' },
      { id: 3, type_category: 'other' },
    ];

    const wrapper = mount(Home);
    await nextTick();
    await flushPromises();

    const fileIcons = wrapper.findComponent({ name: 'FileIconsStub' });
    expect(fileIcons.exists()).toBe(true);
    expect(fileIcons.props('files').map(file => file.id)).toEqual([1, 2, 3]);

    wrapper.unmount();
  });

  it('refreshes desktop files after a delete success event', async () => {
    const wrapper = mount(Home);
    await flushPromises();

    const initialCalls = homeMocks.fetchListMock.mock.calls.length;
    wrapper.findComponent({ name: 'FileIconsStub' }).vm.$emit('delete-success');
    await flushPromises();

    expect(homeMocks.fetchListMock).toHaveBeenCalledTimes(initialCalls + 1);

    wrapper.unmount();
  });

  it('auto arranges desktop icons after upload succeeds', async () => {
    const wrapper = mount(Home);
    await flushPromises();

    expect(homeMocks.dropZoneOptions?.upload).toBeTypeOf('function');

    await homeMocks.dropZoneOptions.upload([{ name: 'new-file.txt', size: 1 }]);
    await flushPromises();

    expect(homeMocks.uploadMock).toHaveBeenCalledWith([
      { name: 'new-file.txt', size: 1 },
    ]);
    expect(homeMocks.appAutoArrangeMock).toHaveBeenCalledWith(0);
    expect(homeMocks.fileAutoArrangeMock).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });
});

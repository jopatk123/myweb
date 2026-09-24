import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const filesRef = ref([]);
const activeWallpaperRef = ref(null);
const selectionRectRef = ref({ visible: false, x: 0, y: 0, w: 0, h: 0 });
const dragOverRef = ref(false);

const homeMocks = vi.hoisted(() => ({
  fetchAll: vi.fn().mockResolvedValue(),
  upload: vi.fn().mockResolvedValue(),
  cancelUpload: vi.fn(),
  getDownloadUrl: vi.fn(() => '/api/download'),
  randomWallpaper: vi.fn(),
  ensurePreloaded: vi.fn().mockResolvedValue(),
  fetchCurrentGroup: vi.fn().mockResolvedValue(),
  fetchActiveWallpaper: vi.fn().mockResolvedValue(),
  manualOpenMessageBoard: vi.fn(),
  selectionMouseDown: vi.fn(),
  selectionMouseMove: vi.fn(),
  selectionMouseUp: vi.fn(),
  getSelectedIconIds: vi.fn(() => ({ apps: [], files: [] })),
  appSetSelectedIds: vi.fn(),
  fileSetSelectedIds: vi.fn(),
  openMenu: vi.fn(),
  handleSelect: vi.fn(),
  closeMenu: vi.fn(),
  openFile: vi.fn(),
  handlePreviewFromConfirm: vi.fn(),
  startAutostartApps: vi.fn(),
  createWindow: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showInfo: vi.fn(),
  dropZoneOptions: null,
  fileActionsOptions: null,
  contextMenuOptions: null,
}));

vi.mock('@/composables/useWallpaper.js', () => ({
  useWallpaper: () => ({
    randomWallpaper: homeMocks.randomWallpaper,
    ensurePreloaded: homeMocks.ensurePreloaded,
    fetchCurrentGroup: homeMocks.fetchCurrentGroup,
    fetchActiveWallpaper: homeMocks.fetchActiveWallpaper,
    activeWallpaper: activeWallpaperRef,
  }),
}));

vi.mock('@/composables/useFiles.js', () => ({
  useFiles: () => ({
    items: filesRef,
    fetchAll: homeMocks.fetchAll,
    upload: homeMocks.upload,
    cancelUpload: homeMocks.cancelUpload,
    uploading: ref(false),
    uploadProgress: ref(0),
    uploadedBytes: ref(0),
    totalBytes: ref(0),
    currentFileName: ref(''),
    uploadQueue: ref([]),
    error: ref(''),
    getDownloadUrl: homeMocks.getDownloadUrl,
  }),
}));

vi.mock('@/composables/useGlobalToast.js', () => ({
  useGlobalToast: () => ({
    showSuccess: homeMocks.showSuccess,
    showError: homeMocks.showError,
    showInfo: homeMocks.showInfo,
    showToast: vi.fn(),
    hideToast: vi.fn(),
    toastState: {},
  }),
}));

vi.mock('@/composables/filePreview.js', () => ({
  openFilePreviewWindow: vi.fn(),
}));

vi.mock('@/composables/useDesktopSelection.js', () => ({
  default: () => ({
    selectionRect: selectionRectRef,
    onMouseDown: homeMocks.selectionMouseDown,
    onMouseMove: homeMocks.selectionMouseMove,
    onMouseUp: homeMocks.selectionMouseUp,
    getSelectedIconIds: homeMocks.getSelectedIconIds,
  }),
}));

vi.mock('@/composables/useWindowManager.js', () => ({
  useWindowManager: () => ({
    createWindow: homeMocks.createWindow,
  }),
}));

vi.mock('@/composables/useAutostartApps.js', () => ({
  default: () => ({
    startAutostartApps: homeMocks.startAutostartApps,
  }),
}));

vi.mock('@/composables/useMessageBoardAutoOpen.js', () => ({
  useMessageBoardAutoOpen: () => ({
    manualOpenMessageBoard: homeMocks.manualOpenMessageBoard,
  }),
}));

vi.mock('@/composables/useDesktopDropZone.js', () => ({
  useDesktopDropZone: options => {
    homeMocks.dropZoneOptions = options;
    return {
      dragOver: dragOverRef,
      onDragOver: vi.fn(),
      onDragLeave: vi.fn(),
      onDrop: vi.fn(),
    };
  },
}));

vi.mock('@/composables/useDesktopFileActions.js', () => ({
  useDesktopFileActions: options => {
    homeMocks.fileActionsOptions = options;
    return {
      showConfirm: ref(false),
      selectedFileName: ref(''),
      selectedDownloadUrl: ref(''),
      selectedFile: ref(null),
      canPreviewSelected: ref(false),
      openFile: homeMocks.openFile,
      handlePreviewFromConfirm: homeMocks.handlePreviewFromConfirm,
    };
  },
}));

vi.mock('@/composables/useDesktopContextMenu.js', () => ({
  useDesktopContextMenu: options => {
    homeMocks.contextMenuOptions = options;
    return {
      desktopMenu: { visible: false, x: 0, y: 0, items: [] },
      openMenu: homeMocks.openMenu,
      handleSelect: homeMocks.handleSelect,
      closeMenu: homeMocks.closeMenu,
    };
  },
}));

vi.mock('@/components/wallpaper/WallpaperBackground.vue', () => ({
  default: defineComponent({
    name: 'WallpaperBackgroundStub',
    props: { wallpaper: { type: Object, default: null } },
    setup: () => () => h('div', { class: 'wallpaper-background-stub' }),
  }),
}));

vi.mock('@/components/desktop/AppIcons.vue', () => ({
  default: defineComponent({
    name: 'AppIconsStub',
    setup(_props, { expose }) {
      expose({
        autoArrange: vi.fn(),
        setSelectedIds: homeMocks.appSetSelectedIds,
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
        autoArrange: vi.fn(),
        setSelectedIds: homeMocks.fileSetSelectedIds,
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
    props: { uploading: { type: Boolean, default: false } },
    emits: ['cancel'],
    setup: () => () => h('div', { class: 'upload-progress-stub' }),
  }),
}));

vi.mock('@/components/file/ConfirmDownloadModal.vue', () => ({
  default: defineComponent({
    name: 'ConfirmDownloadModalStub',
    props: { modelValue: { type: Boolean, default: false } },
    setup: () => () => h('div', { class: 'confirm-download-modal-stub' }),
  }),
}));

vi.mock('@/components/common/ContextMenu.vue', () => ({
  default: defineComponent({
    name: 'ContextMenuStub',
    props: {
      modelValue: { type: Boolean, default: false },
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      items: { type: Array, default: () => [] },
    },
    emits: ['select', 'update:modelValue'],
    setup: () => () => h('div', { class: 'context-menu-stub' }),
  }),
}));

vi.mock('@/components/common/FloatingControls.vue', () => ({
  default: defineComponent({
    name: 'FloatingControlsStub',
    emits: ['random', 'message'],
    setup: () => () => h('div', { class: 'floating-controls-stub' }),
  }),
}));

import Home from '@/views/Home.vue';

const LAST_WALLPAPER_KEY = 'desktop:lastWallpaper';

const mountHome = async () => {
  const wrapper = mount(Home);
  await flushPromises();
  return wrapper;
};

const wallpaperProp = wrapper =>
  wrapper.findComponent({ name: 'WallpaperBackgroundStub' }).props('wallpaper');

describe('Home view', () => {
  beforeEach(() => {
    filesRef.value = [];
    activeWallpaperRef.value = null;
    selectionRectRef.value = { visible: false, x: 0, y: 0, w: 0, h: 0 };
    dragOverRef.value = false;
    homeMocks.dropZoneOptions = null;
    homeMocks.fileActionsOptions = null;
    homeMocks.contextMenuOptions = null;
    localStorage.clear();
    homeMocks.fetchAll.mockResolvedValue();
    homeMocks.upload.mockResolvedValue();
    homeMocks.randomWallpaper.mockResolvedValue(null);
    homeMocks.ensurePreloaded.mockResolvedValue();
    homeMocks.fetchCurrentGroup.mockResolvedValue();
    homeMocks.fetchActiveWallpaper.mockResolvedValue();
    homeMocks.getSelectedIconIds.mockReturnValue({ apps: [], files: [] });
  });

  it('restores cached wallpaper from localStorage on first paint', async () => {
    const cached = { id: 3, url: '/uploads/w3.jpg' };
    localStorage.setItem(LAST_WALLPAPER_KEY, JSON.stringify(cached));

    const wrapper = await mountHome();

    expect(wallpaperProp(wrapper)).toEqual(cached);
    wrapper.unmount();
  });

  it('ignores corrupted cached wallpaper and keeps default background', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(LAST_WALLPAPER_KEY, '{oops');

    const wrapper = await mountHome();

    expect(wallpaperProp(wrapper)).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    wrapper.unmount();
  });

  it('adopts server active wallpaper after mount and persists it', async () => {
    const serverWallpaper = { id: 9, url: '/uploads/w9.jpg' };
    activeWallpaperRef.value = serverWallpaper;

    const wrapper = await mountHome();

    expect(wallpaperProp(wrapper)).toEqual(serverWallpaper);
    expect(JSON.parse(localStorage.getItem(LAST_WALLPAPER_KEY))).toEqual(
      serverWallpaper
    );
    expect(homeMocks.fetchCurrentGroup).toHaveBeenCalled();
    expect(homeMocks.ensurePreloaded).toHaveBeenCalledWith(2);
    wrapper.unmount();
  });

  it('random button updates wallpaper, preloads and keeps null results', async () => {
    const wallpaper = { id: 5, url: '/uploads/w5.jpg' };
    homeMocks.randomWallpaper.mockResolvedValue(wallpaper);
    const wrapper = await mountHome();

    wrapper.findComponent({ name: 'FloatingControlsStub' }).vm.$emit('random');
    await flushPromises();

    expect(wallpaperProp(wrapper)).toEqual(wallpaper);
    expect(homeMocks.ensurePreloaded).toHaveBeenCalledWith(2);
    expect(JSON.parse(localStorage.getItem(LAST_WALLPAPER_KEY))).toEqual(
      wallpaper
    );

    homeMocks.randomWallpaper.mockResolvedValue(null);
    wrapper.findComponent({ name: 'FloatingControlsStub' }).vm.$emit('random');
    await flushPromises();

    expect(wallpaperProp(wrapper)).toEqual(wallpaper);
    wrapper.unmount();
  });

  it('message button opens the message board manually', async () => {
    const wrapper = await mountHome();

    wrapper.findComponent({ name: 'FloatingControlsStub' }).vm.$emit('message');
    await nextTick();

    expect(homeMocks.manualOpenMessageBoard).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('cancel upload stops the queue and notifies the user', async () => {
    const wrapper = await mountHome();

    wrapper
      .findComponent({ name: 'FileUploadProgressStub' })
      .vm.$emit('cancel');
    await nextTick();

    expect(homeMocks.cancelUpload).toHaveBeenCalledTimes(1);
    expect(homeMocks.showInfo).toHaveBeenCalledWith('已取消上传');
    wrapper.unmount();
  });

  it('logs delete errors raised by file icons', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = await mountHome();
    warnSpy.mockClear();

    wrapper
      .findComponent({ name: 'FileIconsStub' })
      .vm.$emit('delete-error', { file: { id: 1 }, error: new Error('boom') });

    expect(warnSpy).toHaveBeenCalledWith(
      '[Home] File delete failed',
      expect.any(Error)
    );
    warnSpy.mockRestore();
    wrapper.unmount();
  });

  it('refreshes files after delete success and logs refresh failures', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = await mountHome();
    // mount-time fetchAll consumes the once-rejection, inject after mount
    homeMocks.fetchAll.mockRejectedValueOnce(new Error('network down'));
    warnSpy.mockClear();

    wrapper.findComponent({ name: 'FileIconsStub' }).vm.$emit('delete-success');
    await flushPromises();

    expect(warnSpy).toHaveBeenCalledWith(
      '[Home] Refresh after file delete failed',
      expect.any(Error)
    );
    warnSpy.mockRestore();
    wrapper.unmount();
  });

  it('reports upload errors from the drop zone in all shapes', async () => {
    const wrapper = await mountHome();
    const { onError } = homeMocks.dropZoneOptions;

    onError({ errors: ['第一个失败', '', '第二个失败'] });
    expect(homeMocks.showError).toHaveBeenLastCalledWith(
      '第一个失败；第二个失败'
    );

    onError({ message: '网络中断' });
    expect(homeMocks.showError).toHaveBeenLastCalledWith('网络中断');

    onError(undefined);
    expect(homeMocks.showError).toHaveBeenLastCalledWith('上传失败');
    wrapper.unmount();
  });

  it('drop zone upload forwards refresh=all to the files composable', async () => {
    const wrapper = await mountHome();

    await homeMocks.dropZoneOptions.upload([{ name: 'a.txt', size: 1 }]);

    expect(homeMocks.upload).toHaveBeenCalledWith(
      [{ name: 'a.txt', size: 1 }],
      {
        refresh: 'all',
      }
    );
    wrapper.unmount();
  });

  it('desktop contextmenu opens the menu and select delegates to handler', async () => {
    const wrapper = await mountHome();

    await wrapper.find('.home').trigger('contextmenu');
    expect(homeMocks.openMenu).toHaveBeenCalledTimes(1);

    wrapper
      .findComponent({ name: 'ContextMenuStub' })
      .vm.$emit('select', 'random');
    expect(homeMocks.handleSelect).toHaveBeenCalledWith('random');
    wrapper.unmount();
  });

  it('mouse down closes the menu and starts the selection flow', async () => {
    const wrapper = await mountHome();

    await wrapper.find('.home').trigger('mousedown');
    await wrapper.find('.home').trigger('mousemove');

    expect(homeMocks.closeMenu).toHaveBeenCalledTimes(1);
    expect(homeMocks.selectionMouseDown).toHaveBeenCalledTimes(1);
    expect(homeMocks.selectionMouseMove).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('mouse up applies selected icon ids to both icon groups', async () => {
    selectionRectRef.value = { visible: true, x: 0, y: 0, w: 10, h: 10 };
    homeMocks.getSelectedIconIds.mockReturnValue({ apps: [1, 2], files: [3] });
    const wrapper = await mountHome();

    await wrapper.find('.home').trigger('mouseup');

    expect(homeMocks.appSetSelectedIds).toHaveBeenCalledWith([1, 2]);
    expect(homeMocks.fileSetSelectedIds).toHaveBeenCalledWith([3]);
    expect(homeMocks.selectionMouseUp).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it('renders the selection rect only while a selection is active', async () => {
    const wrapper = await mountHome();
    expect(wrapper.find('.selection-rect').exists()).toBe(false);

    selectionRectRef.value = { visible: true, x: 5, y: 6, w: 7, h: 8 };
    await nextTick();

    const rect = wrapper.find('.selection-rect');
    expect(rect.exists()).toBe(true);
    expect(rect.attributes('style')).toContain('left: 5px');
    expect(rect.attributes('style')).toContain('top: 6px');

    selectionRectRef.value = { visible: false, x: 0, y: 0, w: 0, h: 0 };
    await nextTick();
    expect(wrapper.find('.selection-rect').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows the drop overlay only while dragging over the desktop', async () => {
    const wrapper = await mountHome();
    expect(wrapper.find('.desktop-drop-overlay').exists()).toBe(false);

    dragOverRef.value = true;
    await nextTick();

    const overlay = wrapper.find('.desktop-drop-overlay');
    expect(overlay.exists()).toBe(true);
    expect(overlay.text()).toContain('松开以上传到桌面');

    dragOverRef.value = false;
    await nextTick();
    expect(wrapper.find('.desktop-drop-overlay').exists()).toBe(false);
    wrapper.unmount();
  });

  it('guards desktop files against non-array composable state', async () => {
    filesRef.value = 'not-an-array';
    const wrapper = await mountHome();

    const fileIcons = wrapper.findComponent({ name: 'FileIconsStub' });
    expect(fileIcons.props('files')).toEqual([]);
    expect(fileIcons.attributes('data-count')).toBe('0');
    wrapper.unmount();
  });

  it('wires the download url resolver into desktop file actions', async () => {
    const wrapper = await mountHome();

    expect(homeMocks.fileActionsOptions.getDownloadUrl).toBe(
      homeMocks.getDownloadUrl
    );
    expect(homeMocks.contextMenuOptions.onRandom).toBeTypeOf('function');
    wrapper.unmount();
  });
});

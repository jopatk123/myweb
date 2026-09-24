import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import FileIcons from '@/components/desktop/FileIcons.vue';

const NamedContextMenuStub = defineComponent({
  name: 'ContextMenuStub',
  props: ['modelValue', 'x', 'y', 'items'],
  emits: ['select', 'update:modelValue'],
  template: '<div class="context-menu-stub" />',
});

const NamedConfirmDialogStub = defineComponent({
  name: 'ConfirmDialogStub',
  props: ['modelValue', 'title', 'message'],
  emits: ['confirm', 'update:modelValue'],
  template: '<div class="confirm-dialog-stub" />',
});

const mountFileIcons = async ({ files = [], icons = {} } = {}) => {
  const wrapper = mount(FileIcons, {
    props: { files, icons },
    global: {
      stubs: {
        ContextMenu: NamedContextMenuStub,
        ConfirmDialog: NamedConfirmDialogStub,
      },
    },
  });
  await nextTick();
  return wrapper;
};

const fileMocks = vi.hoisted(() => ({
  getDownloadUrlMock: vi.fn(id => `/api/files/${id}/download`),
  removeMock: vi.fn(),
}));

// Mock composables
vi.mock('@/composables/useFiles.js', () => ({
  useFiles: vi.fn(() => ({
    getDownloadUrl: fileMocks.getDownloadUrlMock,
    remove: fileMocks.removeMock,
  })),
}));

vi.mock('@/composables/useDesktopGrid.js', () => ({
  default: vi.fn(() => ({
    GRID: { cellWidth: 88, cellHeight: 88, maxRows: 8 },
    cellToPosition: vi.fn(({ col, row }) => ({ x: col * 88, y: row * 88 })),
    finalizeDragForPositions: vi.fn(),
    savePositionsToStorage: vi.fn(),
    loadPositionsFromStorage: vi.fn(() => ({})),
  })),
}));

describe('FileIcons', () => {
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('右键菜单功能', () => {
    it('右键点击文件图标应该显示菜单但不触发拖动', async () => {
      const mockFiles = [
        {
          id: 1,
          originalName: 'test.txt',
          original_name: 'test.txt',
          typeCategory: 'text',
          type_category: 'text',
        },
      ];

      wrapper = mount(FileIcons, {
        props: {
          files: mockFiles,
          icons: { text: '/apps/icons/text-128.svg' },
        },
        global: {
          stubs: {
            ContextMenu: {
              template: '<div class="context-menu-stub" />',
              props: ['modelValue', 'x', 'y', 'items'],
            },
            ConfirmDialog: {
              template: '<div class="confirm-dialog-stub" />',
              props: ['modelValue', 'title', 'message'],
            },
          },
        },
      });

      await nextTick();

      const iconItem = wrapper.find('.icon-item');
      expect(iconItem.exists()).toBe(true);

      // 模拟右键点击事件 (button = 2 表示右键)
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 2,
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // 触发右键按下
      await iconItem.element.dispatchEvent(mouseDownEvent);
      await nextTick();

      // 触发右键菜单
      await iconItem.trigger('contextmenu', { clientX: 100, clientY: 100 });
      await nextTick();

      // 验证：右键点击不应该启动拖动定时器
      expect(setTimeoutSpy).not.toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });

    it('左键点击文件图标应该可以触发拖动', async () => {
      const mockFiles = [
        {
          id: 1,
          originalName: 'test.txt',
          original_name: 'test.txt',
          typeCategory: 'text',
          type_category: 'text',
        },
      ];

      wrapper = mount(FileIcons, {
        props: {
          files: mockFiles,
          icons: { text: '/apps/icons/text-128.svg' },
        },
        global: {
          stubs: {
            ContextMenu: {
              template: '<div class="context-menu-stub" />',
              props: ['modelValue', 'x', 'y', 'items'],
            },
            ConfirmDialog: {
              template: '<div class="confirm-dialog-stub" />',
              props: ['modelValue', 'title', 'message'],
            },
          },
        },
      });

      await nextTick();

      const iconItem = wrapper.find('.icon-item');
      expect(iconItem.exists()).toBe(true);

      // 模拟左键点击事件 (button = 0 表示左键)
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 0,
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // 触发左键按下
      await iconItem.element.dispatchEvent(mouseDownEvent);
      await nextTick();

      // 验证：左键点击应该启动拖动定时器（150ms后触发拖动）
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 150);

      setTimeoutSpy.mockRestore();
    });

    it('右键点击后释放鼠标不应该启动拖动监听器', async () => {
      const mockFiles = [
        {
          id: 1,
          originalName: 'test.txt',
          original_name: 'test.txt',
          typeCategory: 'text',
          type_category: 'text',
        },
      ];

      wrapper = mount(FileIcons, {
        props: {
          files: mockFiles,
          icons: { text: '/apps/icons/text-128.svg' },
        },
        global: {
          stubs: {
            ContextMenu: {
              template: '<div class="context-menu-stub" />',
              props: ['modelValue', 'x', 'y', 'items'],
            },
            ConfirmDialog: {
              template: '<div class="confirm-dialog-stub" />',
              props: ['modelValue', 'title', 'message'],
            },
          },
        },
      });

      await nextTick();

      const iconItem = wrapper.find('.icon-item');

      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      // 模拟右键点击
      const mouseDownEvent = new MouseEvent('mousedown', {
        button: 2,
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });

      await iconItem.element.dispatchEvent(mouseDownEvent);
      await nextTick();

      // 模拟松开鼠标
      const mouseUpEvent = new MouseEvent('mouseup', {
        button: 2,
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });

      document.dispatchEvent(mouseUpEvent);
      await nextTick();

      // 验证：不应该添加 mousemove 监听器
      const mouseMoveListenerAdded = addEventListenerSpy.mock.calls.some(
        call => call[0] === 'mousemove'
      );
      expect(mouseMoveListenerAdded).toBe(false);

      addEventListenerSpy.mockRestore();
    });

    it('删除失败时应该发出错误事件', async () => {
      fileMocks.removeMock.mockRejectedValueOnce(new Error('delete failed'));

      const mockFiles = [
        {
          id: 1,
          originalName: 'test.txt',
          original_name: 'test.txt',
          typeCategory: 'text',
          type_category: 'text',
        },
      ];

      wrapper = mount(FileIcons, {
        props: {
          files: mockFiles,
          icons: { text: '/apps/icons/text-128.svg' },
        },
        global: {
          stubs: {
            ContextMenu: {
              template: '<div class="context-menu-stub" />',
              props: ['modelValue', 'x', 'y', 'items'],
            },
            ConfirmDialog: {
              template: '<div class="confirm-dialog-stub" />',
              props: ['modelValue', 'title', 'message'],
            },
          },
        },
      });

      await nextTick();

      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      wrapper.vm.confirm.file = mockFiles[0];
      await wrapper.vm.onConfirmDelete();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'FileIcons.delete error',
        expect.any(Error)
      );
      expect(wrapper.emitted('delete-error')).toBeTruthy();

      consoleErrorSpy.mockRestore();
    });

    it('删除成功时应该发出成功事件', async () => {
      fileMocks.removeMock.mockResolvedValueOnce();

      const mockFiles = [
        {
          id: 1,
          originalName: 'test.txt',
          original_name: 'test.txt',
          typeCategory: 'text',
          type_category: 'text',
        },
      ];

      wrapper = mount(FileIcons, {
        props: {
          files: mockFiles,
          icons: { text: '/apps/icons/text-128.svg' },
        },
        global: {
          stubs: {
            ContextMenu: {
              template: '<div class="context-menu-stub" />',
              props: ['modelValue', 'x', 'y', 'items'],
            },
            ConfirmDialog: {
              template: '<div class="confirm-dialog-stub" />',
              props: ['modelValue', 'title', 'message'],
            },
          },
        },
      });

      await nextTick();

      wrapper.vm.confirm.file = mockFiles[0];
      await wrapper.vm.onConfirmDelete();

      expect(wrapper.emitted('delete-success')).toBeTruthy();
      expect(wrapper.emitted('delete-success')[0][0]).toEqual({
        file: mockFiles[0],
      });
    });
  });

  describe('图标解析与右键菜单动作', () => {
    afterEach(() => {
      if (wrapper) {
        wrapper.unmount();
        wrapper = null;
      }
    });

    it('resolves icons by camelCase/snake_case type with other/default fallbacks', async () => {
      const files = [
        { id: 1, typeCategory: 'image' },
        { id: 2, type_category: 'video' },
        { id: 3, typeCategory: 'weird' },
        { id: 4 },
      ];
      const vm = await mountFileIcons({
        files,
        icons: { image: 'i.svg', video: 'v.svg', other: 'o.svg' },
      });
      wrapper = vm;

      expect(
        wrapper.findAll('img.icon').map(img => img.attributes('src'))
      ).toEqual(['i.svg', 'v.svg', 'o.svg', 'o.svg']);
    });

    it('falls back to the default icon when no icon map is provided', async () => {
      const vm = await mountFileIcons({
        files: [{ id: 1, typeCategory: 'text' }],
      });
      wrapper = vm;

      expect(wrapper.find('img.icon').attributes('src')).toBe(
        '/apps/icons/file-128.svg'
      );
    });

    it('dblclick emits open with the file', async () => {
      const file = { id: 5, originalName: 'doc.pdf', typeCategory: 'pdf' };
      const vm = await mountFileIcons({ files: [file] });
      wrapper = vm;

      await wrapper.find('.icon-item').trigger('dblclick');

      expect(wrapper.emitted('open')[0][0]).toEqual(file);
    });

    it('preview item only appears for previewable file types', async () => {
      const files = [
        { id: 1, typeCategory: 'image', originalName: 'a.png' },
        { id: 2, typeCategory: 'text', originalName: 'b.txt' },
      ];
      const vm = await mountFileIcons({ files });
      wrapper = vm;
      const items = wrapper.findAll('.icon-item');

      await items[0].trigger('contextmenu', { clientX: 1, clientY: 2 });
      let menu = wrapper.findComponent({ name: 'ContextMenuStub' });
      expect(menu.props('items')[0].key).toBe('preview');
      expect(menu.props('modelValue')).toBe(true);

      await items[1].trigger('contextmenu', { clientX: 1, clientY: 2 });
      menu = wrapper.findComponent({ name: 'ContextMenuStub' });
      expect(menu.props('items').map(i => i.key)).toEqual([
        'download',
        'delete',
      ]);
    });

    it('download action opens an anchor with file metadata', async () => {
      const file = { id: 9, originalName: 'a.txt', typeCategory: 'text' };
      const createElementSpy = vi.spyOn(document, 'createElement');
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
      const vm = await mountFileIcons({ files: [file] });
      wrapper = vm;

      await wrapper.find('.icon-item').trigger('contextmenu');
      wrapper
        .findComponent({ name: 'ContextMenuStub' })
        .vm.$emit('select', 'download');

      const anchor = createElementSpy.mock.results
        .map(result => result.value)
        .find(el => el && el.tagName === 'A');
      expect(anchor.href).toContain('/api/files/9/download');
      expect(anchor.download).toBe('a.txt');
      expect(anchor.target).toBe('_blank');
      expect(clickSpy).toHaveBeenCalledTimes(1);

      clickSpy.mockRestore();
      createElementSpy.mockRestore();
    });

    it('delete action opens the confirm dialog for the file', async () => {
      const file = { id: 3, originalName: 'x.png', typeCategory: 'image' };
      const vm = await mountFileIcons({ files: [file] });
      wrapper = vm;

      await wrapper.find('.icon-item').trigger('contextmenu');
      wrapper
        .findComponent({ name: 'ContextMenuStub' })
        .vm.$emit('select', 'delete');
      await nextTick();

      const dialog = wrapper.findComponent({ name: 'ConfirmDialogStub' });
      expect(dialog.props('modelValue')).toBe(true);
      expect(dialog.props('message')).toContain('x.png');
    });

    it('preview action re-emits open with preview flag', async () => {
      const file = { id: 4, originalName: 'v.mp4', typeCategory: 'video' };
      const vm = await mountFileIcons({ files: [file] });
      wrapper = vm;

      await wrapper.find('.icon-item').trigger('contextmenu');
      wrapper
        .findComponent({ name: 'ContextMenuStub' })
        .vm.$emit('select', 'preview');

      expect(wrapper.emitted('open')[0][0]).toMatchObject({
        id: 4,
        __preview: true,
      });
    });

    it('menu actions are ignored when no file was opened via context menu', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const vm = await mountFileIcons({
        files: [{ id: 1, originalName: 'a.txt', typeCategory: 'text' }],
      });
      wrapper = vm;
      createElementSpy.mockClear();

      wrapper
        .findComponent({ name: 'ContextMenuStub' })
        .vm.$emit('select', 'download');
      wrapper
        .findComponent({ name: 'ContextMenuStub' })
        .vm.$emit('select', 'delete');
      await nextTick();

      expect(createElementSpy).not.toHaveBeenCalled();
      expect(
        wrapper.findComponent({ name: 'ConfirmDialogStub' }).props('modelValue')
      ).toBe(false);
      expect(fileMocks.removeMock).not.toHaveBeenCalled();
      createElementSpy.mockRestore();
    });

    it('confirm delete without a file does nothing', async () => {
      const vm = await mountFileIcons({
        files: [{ id: 1, originalName: 'a.txt', typeCategory: 'text' }],
      });
      wrapper = vm;

      wrapper.vm.confirm = { visible: true, file: null };
      await wrapper.vm.onConfirmDelete();

      expect(fileMocks.removeMock).not.toHaveBeenCalled();
      expect(wrapper.vm.confirm.visible).toBe(false);
    });
  });
});

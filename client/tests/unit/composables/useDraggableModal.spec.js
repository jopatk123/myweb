import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useDraggableModal } from '@/composables/useDraggableModal.js';

function createHostComponent(storageKey) {
  return defineComponent({
    setup() {
      const d = useDraggableModal(storageKey);
      return { d };
    },
    render() {
      return h('div', { ref: 'host' });
    },
  });
}

describe('useDraggableModal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exposes modalRef, modalStyle, onHeaderPointerDown, pos and savePosition', () => {
    const Host = defineComponent({
      setup() {
        const d = useDraggableModal('test-key');
        return { d };
      },
      render() {
        return h('div');
      },
    });

    const wrapper = mount(Host);
    const { d } = wrapper.vm;

    expect(d.modalRef).toBeDefined();
    expect(d.modalStyle).toBeDefined();
    expect(typeof d.onHeaderPointerDown).toBe('function');
    expect(d.pos).toBeDefined();
    expect(typeof d.savePosition).toBe('function');
  });

  it('modalStyle reflects pos as absolute positioning', async () => {
    const Host = defineComponent({
      setup() {
        const d = useDraggableModal('style-key');
        return { d };
      },
      render() {
        return h('div');
      },
    });

    const wrapper = mount(Host);
    await wrapper.vm.$nextTick();

    const { d } = wrapper.vm;
    // 初始 pos 为 { x: null, y: null }，modalStyle 中 left/top 应为 undefined
    expect(d.modalStyle.value.position).toBe('absolute');
    expect(d.modalStyle.value.left).toBeUndefined();
    expect(d.modalStyle.value.top).toBeUndefined();

    // 模拟设置位置后，modalStyle 应反映像素值
    d.pos.value = { x: 100, y: 200 };
    expect(d.modalStyle.value.left).toBe('100px');
    expect(d.modalStyle.value.top).toBe('200px');
  });

  it('requires a string storageKey (empty string falls back gracefully)', async () => {
    const Host = defineComponent({
      setup() {
        const d = useDraggableModal('   ');
        return { d };
      },
      render() {
        return h('div');
      },
    });

    const wrapper = mount(Host);
    await wrapper.vm.$nextTick();

    // storageKey 为空白时 getStorageKey 返回空串，savePosition/loadPosition 直接 return
    const { d } = wrapper.vm;
    expect(() => d.savePosition()).not.toThrow();
  });

  it('savePosition persists pos to localStorage under the given key', async () => {
    const Host = defineComponent({
      setup() {
        const d = useDraggableModal('persist-key');
        return { d };
      },
      render() {
        return h('div');
      },
    });

    const wrapper = mount(Host);
    await wrapper.vm.$nextTick();

    const { d } = wrapper.vm;
    d.pos.value = { x: 42, y: 99 };
    d.savePosition();

    const stored = JSON.parse(localStorage.getItem('persist-key'));
    expect(stored).toEqual({ x: 42, y: 99 });
  });

  it('onHeaderPointerDown ignores non-left clicks', async () => {
    const Host = createHostComponent('click-key');
    const wrapper = mount(Host);
    await wrapper.vm.$nextTick();

    const { d } = wrapper.vm;
    const addSpy = vi.spyOn(window, 'addEventListener');

    d.onHeaderPointerDown({ button: 2, clientX: 0, clientY: 0 });

    // 右键不应触发拖拽：不会注册 pointermove 监听
    // 注意：addEventListener 会被其他逻辑调用，这里只验证没有新增 pointermove
    const pointerMoveCalls = addSpy.mock.calls.filter(
      ([event]) => event === 'pointermove'
    );
    expect(pointerMoveCalls.length).toBe(0);

    addSpy.mockRestore();
  });

  it('onHeaderPointerDown starts drag on left click', async () => {
    const Host = createHostComponent('drag-key');
    const wrapper = mount(Host);
    await wrapper.vm.$nextTick();

    const { d } = wrapper.vm;
    const addSpy = vi.spyOn(window, 'addEventListener');

    d.pos.value = { x: 10, y: 20 };
    d.onHeaderPointerDown({ button: 0, clientX: 100, clientY: 100 });

    // 左键应注册 pointermove 和 pointerup
    const events = addSpy.mock.calls.map(([event]) => event);
    expect(events).toContain('pointermove');
    expect(events).toContain('pointerup');

    addSpy.mockRestore();
  });

  it('persists position on mount when storage has valid value', async () => {
    localStorage.setItem('restore-key', JSON.stringify({ x: 150, y: 250 }));

    const Host = defineComponent({
      setup() {
        const d = useDraggableModal('restore-key');
        return { d };
      },
      render() {
        return h('div');
      },
    });

    const wrapper = mount(Host);
    await wrapper.vm.$nextTick();

    const { d } = wrapper.vm;
    expect(d.pos.value).toEqual({ x: 150, y: 250 });
  });
});

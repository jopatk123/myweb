import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
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

// 额外把 modalRef 绑定到真实 DOM，用于测试挂载居中逻辑
function createBoundHostComponent(storageKey) {
  return defineComponent({
    setup() {
      const d = useDraggableModal(storageKey);
      return { d, modalRef: d.modalRef };
    },
    render() {
      return h('div', { ref: 'modalRef' });
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

  it('drags via pointer events and persists on pointer up', async () => {
    const Host = createHostComponent('drag-flow-key');
    const wrapper = mount(Host);
    await wrapper.vm.$nextTick();

    const { d } = wrapper.vm;
    d.pos.value = { x: 10, y: 20 };
    d.onHeaderPointerDown({ button: 0, clientX: 100, clientY: 100 });

    // jsdom 无 PointerEvent，用 MouseEvent 触发同名事件
    window.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 150, clientY: 130 })
    );
    expect(d.pos.value).toEqual({ x: 60, y: 50 });

    window.dispatchEvent(new MouseEvent('pointerup'));
    expect(JSON.parse(localStorage.getItem('drag-flow-key'))).toEqual({
      x: 60,
      y: 50,
    });

    // pointerup 后监听已移除，继续 move 不再更新位置
    window.dispatchEvent(
      new MouseEvent('pointermove', { clientX: 500, clientY: 500 })
    );
    expect(d.pos.value).toEqual({ x: 60, y: 50 });
  });

  it('falls back gracefully when stored position is corrupted or invalid', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('bad-json-key', '{oops');

    const badWrapper = mount(createHostComponent('bad-json-key'));
    await badWrapper.vm.$nextTick();
    expect(badWrapper.vm.d.pos.value).toEqual({ x: null, y: null });
    expect(errorSpy).toHaveBeenCalled();

    // 合法 JSON 但坐标不是数字 → 视为无效，同样回退（不报错）
    localStorage.setItem('bad-shape-key', JSON.stringify({ x: '12', y: 3 }));
    const shapeWrapper = mount(createHostComponent('bad-shape-key'));
    await shapeWrapper.vm.$nextTick();
    expect(shapeWrapper.vm.d.pos.value).toEqual({ x: null, y: null });

    errorSpy.mockRestore();
  });

  it('centers the modal on mount when nothing is stored', async () => {
    const wrapper = mount(createBoundHostComponent('center-key'));
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    // jsdom 中 offsetWidth/offsetHeight 为 0，视口默认 1024x768
    expect(wrapper.vm.d.pos.value).toEqual({ x: 512, y: 384 });

    // 极小视口触发 Math.max 的 10px 下限
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 16,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 16,
    });

    const smallWrapper = mount(createBoundHostComponent('center-key'));
    await smallWrapper.vm.$nextTick();
    await smallWrapper.vm.$nextTick();
    expect(smallWrapper.vm.d.pos.value).toEqual({ x: 10, y: 10 });

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 768,
    });
  });

  it('reloads or recenters when the storage key changes', async () => {
    localStorage.setItem('moved-key', JSON.stringify({ x: 5, y: 6 }));
    const keyRef = ref('initial-key');

    const Host = defineComponent({
      setup() {
        const d = useDraggableModal(keyRef);
        return { d };
      },
      render() {
        return h('div');
      },
    });

    const wrapper = mount(Host);
    await wrapper.vm.$nextTick();

    const { d } = wrapper.vm;
    d.pos.value = { x: 1, y: 1 };

    // 切到有存储的新 key：重置后加载新位置
    keyRef.value = 'moved-key';
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(d.pos.value).toEqual({ x: 5, y: 6 });

    // watch 的 key 是 trim 后的值：仅空白差异视为同一个 key，早退
    keyRef.value = ' moved-key ';
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(d.pos.value).toEqual({ x: 5, y: 6 });

    // 空 key：早退，不重置位置
    keyRef.value = '   ';
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(d.pos.value).toEqual({ x: 5, y: 6 });

    // 无存储的新 key：重置后走居中回退（无 modalRef 时保持 null）
    keyRef.value = 'empty-key';
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    expect(d.pos.value).toEqual({ x: null, y: null });
  });

  it('stringifies non-string storage keys', async () => {
    const wrapper = mount(createHostComponent(123));
    await wrapper.vm.$nextTick();

    const { d } = wrapper.vm;
    d.pos.value = { x: 7, y: 8 };
    d.savePosition();
    expect(JSON.parse(localStorage.getItem('123'))).toEqual({ x: 7, y: 8 });
  });
});

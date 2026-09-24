/**
 * useDesktopIconInteractions 核心行为测试
 *
 * 覆盖：网格位置分配与持久化、长按拖拽状态机、多选整体拖拽、
 * 自动排列与 items 变化后的重新布局。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';

import useDesktopIconInteractions from '@/composables/useDesktopIconInteractions.js';

const CELL = 88;
const ORIGIN = 20;

function cellPosition(col, row) {
  return { x: ORIGIN + col * CELL, y: ORIGIN + row * CELL };
}

function mountInteractions({
  items,
  storageKey = 'desktop-icons',
  defaultStartCol = 0,
} = {}) {
  let api;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useDesktopIconInteractions({
          items: items ?? ref([]),
          storageKey,
          defaultStartCol,
        });
        return () => h('div');
      },
    })
  );
  return { wrapper, api };
}

function makeItemEvent({ button = 0, x = 0, y = 0, left = 20, top = 20 } = {}) {
  return {
    button,
    clientX: x,
    clientY: y,
    currentTarget: {
      getBoundingClientRect: () => ({ left, top, width: 80, height: 80 }),
      ownerDocument: document,
    },
  };
}

function dispatchMove(x, y) {
  document.dispatchEvent(
    new MouseEvent('mousemove', { clientX: x, clientY: y })
  );
}

describe('useDesktopIconInteractions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('throws when storageKey is missing', () => {
    expect(() => useDesktopIconInteractions({ items: [] })).toThrow(
      'useDesktopIconInteractions requires a storageKey'
    );
  });

  it('assigns default grid positions on mount', () => {
    const { api, wrapper } = mountInteractions({
      items: ref([{ id: 1 }, { id: 2 }]),
    });

    expect(api.positions.value[1]).toEqual(cellPosition(0, 0));
    expect(api.positions.value[2]).toEqual(cellPosition(0, 1));
    expect(api.getIconStyle({ id: 1 })).toEqual({
      position: 'fixed',
      left: '20px',
      top: '20px',
    });
    expect(api.getIconStyle({ id: 99 })).toBeUndefined();
    wrapper.unmount();
  });

  it('restores saved positions and assigns free cells to new icons', () => {
    localStorage.setItem(
      'desktop-icons',
      JSON.stringify({ 1: cellPosition(2, 0) })
    );

    const { api, wrapper } = mountInteractions({
      items: ref([{ id: 1 }, { id: 2 }]),
    });

    expect(api.positions.value[1]).toEqual(cellPosition(2, 0));
    expect(api.positions.value[2]).toEqual(cellPosition(0, 0));
    wrapper.unmount();
  });

  it('falls back to grid defaults when stored data is corrupted', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('desktop-icons', '{broken json');

    const { api, wrapper } = mountInteractions({
      items: ref([{ id: 1 }]),
    });

    expect(api.positions.value[1]).toEqual(cellPosition(0, 0));
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
    wrapper.unmount();
  });

  it('wraps to the next column after maxRows is exhausted', () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ id: i + 1 }));
    const { api, wrapper } = mountInteractions({ items: ref(items) });

    expect(api.positions.value[8]).toEqual(cellPosition(0, 7));
    expect(api.positions.value[9]).toEqual(cellPosition(1, 0));
    wrapper.unmount();
  });

  it('updates selection through onClick and setSelectedIds', () => {
    const { api, wrapper } = mountInteractions({
      items: ref([{ id: 1 }]),
    });

    api.onClick({ id: 5 });
    expect(api.selectedId.value).toBe(5);
    expect(Array.from(api.selectedIds.value)).toEqual([5]);

    api.setSelectedIds(['7', '9']);
    expect(Array.from(api.selectedIds.value)).toEqual([7, 9]);
    expect(api.selectedId.value).toBe(5);

    api.setSelectedIds([3]);
    expect(api.selectedId.value).toBe(3);
    wrapper.unmount();
  });

  it('ignores right clicks and cancels drags on short presses', async () => {
    vi.useFakeTimers();
    const { api, wrapper } = mountInteractions({
      items: ref([{ id: 1 }]),
    });
    const item = { id: 1 };

    // 右键不进入拖拽状态
    api.onMouseDown(item, makeItemEvent({ button: 2 }));
    dispatchMove(100, 100);
    expect(api.positions.value[1]).toEqual(cellPosition(0, 0));

    // 短按（<150ms 抬起）不触发拖拽
    api.onMouseDown(item, makeItemEvent({ x: 20, y: 20 }));
    document.dispatchEvent(new MouseEvent('mouseup'));
    await vi.advanceTimersByTimeAsync(200);
    dispatchMove(120, 140);
    expect(api.positions.value[1]).toEqual(cellPosition(0, 0));

    wrapper.unmount();
    vi.useRealTimers();
  });

  it('drags an icon after long press and persists the dropped position', async () => {
    vi.useFakeTimers();
    const { api, wrapper } = mountInteractions({
      items: ref([{ id: 1 }, { id: 2 }]),
    });

    api.onMouseDown({ id: 1 }, makeItemEvent({ x: 20, y: 20 }));
    await vi.advanceTimersByTimeAsync(150);
    dispatchMove(39.4, 30.6);
    expect(api.positions.value[1]).toEqual({ x: 39.4, y: 30.6 });

    document.dispatchEvent(new MouseEvent('mouseup'));
    // 松手后 onMouseUp 里的网格吸附（finalizeDragForPositions）生效：
    // 未对齐的落点 (39.4, 30.6) 被吸附回最近的网格原点 (20, 20)，并持久化吸附结果
    expect(api.positions.value[1]).toEqual(cellPosition(0, 0));
    expect(JSON.parse(localStorage.getItem('desktop-icons'))[1]).toEqual(
      cellPosition(0, 0)
    );

    // 拖拽结束后 mousemove 监听已解绑
    dispatchMove(500, 500);
    expect(api.positions.value[1]).toEqual(cellPosition(0, 0));
    wrapper.unmount();
    vi.useRealTimers();
  });

  it('uses the DOM rect as drag origin when no stored position exists', async () => {
    vi.useFakeTimers();
    const { api, wrapper } = mountInteractions({
      items: ref([{ id: 1 }]),
    });
    api.positions.value = {};

    api.onMouseDown(
      { id: 1 },
      makeItemEvent({ x: 30, y: 40, left: 25, top: 35 })
    );
    await vi.advanceTimersByTimeAsync(150);
    dispatchMove(45, 55);
    expect(api.positions.value[1]).toEqual({ x: 40, y: 50 });

    document.dispatchEvent(new MouseEvent('mouseup'));
    wrapper.unmount();
    vi.useRealTimers();
  });

  it('moves multiple selected icons together using stored positions', async () => {
    vi.useFakeTimers();
    const { api, wrapper } = mountInteractions({
      items: ref([{ id: 1 }, { id: 2 }]),
    });

    api.positions.value = { 1: cellPosition(1, 1), 2: cellPosition(2, 2) };
    api.setSelectedIds([1, 2]);
    api.onMouseDown({ id: 1 }, makeItemEvent({ x: 100, y: 100 }));

    await vi.advanceTimersByTimeAsync(150);
    dispatchMove(60, 80);
    expect(api.positions.value[1]).toEqual({ x: 68, y: 88 });
    expect(api.positions.value[2]).toEqual({ x: 156, y: 176 });

    document.dispatchEvent(new MouseEvent('mouseup'));
    wrapper.unmount();
    vi.useRealTimers();
  });

  it('falls back to DOM rects for multi-drag origins', async () => {
    vi.useFakeTimers();
    const querySpy = vi
      .spyOn(document, 'querySelector')
      .mockImplementation(selector =>
        selector === '[data-id="2"]'
          ? { getBoundingClientRect: () => ({ left: 50, top: 60 }) }
          : null
      );
    const { api, wrapper } = mountInteractions({
      items: ref([{ id: 1 }, { id: 2 }]),
    });
    api.positions.value = {}; // 让 origins 走 DOM rect 回退分支

    api.setSelectedIds([1, 2]);
    api.onMouseDown({ id: 1 }, makeItemEvent({ x: 100, y: 100 }));
    await vi.advanceTimersByTimeAsync(150);
    dispatchMove(40, 60);

    // id 1 无 DOM 节点 → origin 回退 {0,0}；id 2 使用 rect {50,60}
    expect(api.positions.value[1]).toEqual({ x: -60, y: -40 });
    expect(api.positions.value[2]).toEqual({ x: -10, y: 20 });
    querySpy.mockRestore();
    wrapper.unmount();
    vi.useRealTimers();
  });

  it('autoArrange lays icons column-first and returns the next start column', async () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ id: i + 1 }));
    const { api, wrapper } = mountInteractions({ items: ref(items) });

    const nextStartCol = await api.autoArrange();

    expect(api.positions.value[8]).toEqual(cellPosition(0, 7));
    expect(api.positions.value[9]).toEqual(cellPosition(1, 0));
    expect(nextStartCol).toBe(2);
    expect(JSON.parse(localStorage.getItem('desktop-icons'))[1]).toEqual(
      cellPosition(0, 0)
    );
    wrapper.unmount();
  });

  it('reloads positions when item ids change but skips identical lists', async () => {
    const source = ref([{ id: 1 }, { id: 2 }]);
    const { api, wrapper } = mountInteractions({ items: source });

    // 同 ids 时早退，不覆盖现有位置
    api.positions.value[1] = { x: 999, y: 999 };
    api.loadPositionsFromStorage();
    expect(api.positions.value[1]).toEqual({ x: 999, y: 999 });

    // ids 变化后重新加载并给新图标分配空位
    source.value = [...source.value, { id: 3 }];
    await nextTick();
    expect(api.positions.value[1]).toEqual(cellPosition(0, 0));
    expect(api.positions.value[3]).toEqual(cellPosition(0, 2));
    wrapper.unmount();
  });

  it('accepts getter items and tolerates non-array sources', () => {
    const first = mountInteractions({ items: () => [{ id: 1 }] });
    expect(first.api.positions.value[1]).toEqual(cellPosition(0, 0));
    first.wrapper.unmount();

    const second = mountInteractions({ items: { notAnArray: true } });
    expect(second.api.positions.value).toEqual({});
    second.wrapper.unmount();
  });
});

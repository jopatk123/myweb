import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import useDesktopGrid from '@/composables/useDesktopGrid.js';

describe('useDesktopGrid', () => {
  let grid;

  beforeEach(() => {
    grid = useDesktopGrid();
  });

  describe('GRID 常量', () => {
    it('暴露网格布局常量', () => {
      expect(grid.GRID).toEqual({
        originX: 20,
        originY: 20,
        cellW: 88,
        cellH: 88,
        maxRows: 8,
      });
    });
  });

  describe('positionToCell', () => {
    it('把网格原点映射到 0:0 格', () => {
      expect(grid.positionToCell({ x: 20, y: 20 })).toEqual({ col: 0, row: 0 });
    });

    it('按最近格子四舍五入', () => {
      // 138 = 20 + 88 + 30 → 1.34 → 第 1 列
      expect(grid.positionToCell({ x: 138, y: 138 })).toEqual({
        col: 1,
        row: 1,
      });
      // 半格向上取整
      expect(grid.positionToCell({ x: 20 + 44, y: 20 + 44 })).toEqual({
        col: 1,
        row: 1,
      });
    });

    it('负坐标收敛到 0 格，不产生负索引', () => {
      expect(grid.positionToCell({ x: -200, y: -1 })).toEqual({
        col: 0,
        row: 0,
      });
    });
  });

  describe('cellToPosition', () => {
    it('返回格子左上角像素坐标', () => {
      expect(grid.cellToPosition({ col: 2, row: 3 })).toEqual({
        x: 20 + 2 * 88,
        y: 20 + 3 * 88,
      });
    });

    it('与 positionToCell 构成往返换算', () => {
      const pos = grid.cellToPosition({ col: 4, row: 5 });
      expect(grid.positionToCell(pos)).toEqual({ col: 4, row: 5 });
    });
  });

  describe('getOccupiedCellKeys', () => {
    it('收集所有已占用格子', () => {
      const set = grid.getOccupiedCellKeys({
        1: { x: 20, y: 20 },
        2: { x: 108, y: 20 },
      });
      expect([...set].sort()).toEqual(['0:0', '1:0']);
    });

    it('跳过空值位置并容忍 null 入参', () => {
      expect(grid.getOccupiedCellKeys({ 1: null, 2: undefined })).toEqual(
        new Set()
      );
      expect(grid.getOccupiedCellKeys(null)).toEqual(new Set());
    });

    it('排除单个拖拽中的 id', () => {
      const set = grid.getOccupiedCellKeys(
        { 1: { x: 20, y: 20 }, 2: { x: 108, y: 20 } },
        1
      );
      expect([...set]).toEqual(['1:0']);
    });

    it('支持数组形式排除多个 id', () => {
      const set = grid.getOccupiedCellKeys(
        { 1: { x: 20, y: 20 }, 2: { x: 108, y: 20 } },
        [1, 2]
      );
      expect(set.size).toBe(0);
    });
  });

  describe('findNextFreeCell', () => {
    it('目标格空闲时原样返回', () => {
      expect(grid.findNextFreeCell({ col: 3, row: 2 }, new Set())).toEqual({
        col: 3,
        row: 2,
      });
    });

    it('列内被占时向下顺延', () => {
      const occupied = new Set(['2:0', '2:1']);
      expect(grid.findNextFreeCell({ col: 2, row: 0 }, occupied)).toEqual({
        col: 2,
        row: 2,
      });
    });

    it('超出 maxRows*5 行后换到下一列第一行', () => {
      const occupied = new Set(
        Array.from({ length: 41 }, (_, row) => `0:${row}`)
      );
      expect(grid.findNextFreeCell({ col: 0, row: 0 }, occupied)).toEqual({
        col: 1,
        row: 0,
      });
    });

    it('满员时兜底返回目标格，避免死循环', () => {
      const occupied = new Set();
      for (let col = 0; col < 300; col++) {
        for (let row = 0; row <= 40; row++) {
          occupied.add(`${col}:${row}`);
        }
      }
      expect(grid.findNextFreeCell({ col: 0, row: 0 }, occupied)).toEqual({
        col: 0,
        row: 0,
      });
    });
  });

  describe('finalizeDragForPositions', () => {
    it('把拖拽后的像素位置吸附到网格坐标', () => {
      const positions = ref({ 1: { x: 30, y: 40 } });
      grid.finalizeDragForPositions(positions, 1);
      expect(positions.value[1]).toEqual({ x: 20, y: 20 });
    });

    it('拖拽 id 自身不作为障碍物，可落在自己的目标格', () => {
      const positions = ref({ 1: { x: 20, y: 20 }, 2: { x: 108, y: 20 } });
      grid.finalizeDragForPositions(positions, 1);
      expect(positions.value[1]).toEqual({ x: 20, y: 20 });
      // 未拖拽的图标位置保持不变
      expect(positions.value[2]).toEqual({ x: 108, y: 20 });
    });

    it('多个图标挤在同一格时，后处理者向下顺延一格', () => {
      const positions = ref({
        1: { x: 20, y: 20 },
        2: { x: 25, y: 25 }, // 同为 0:0 格
      });
      grid.finalizeDragForPositions(positions, [1, 2]);
      expect(positions.value[1]).toEqual({ x: 20, y: 20 });
      expect(positions.value[2]).toEqual({ x: 20, y: 20 + 88 });
    });

    it('忽略不存在的 id', () => {
      const positions = ref({ 1: { x: 30, y: 40 } });
      grid.finalizeDragForPositions(positions, 99);
      expect(positions.value[1]).toEqual({ x: 30, y: 40 });
    });
  });

  describe('savePositionsToStorage', () => {
    it('只持久化有效 id 且坐标为数字的条目', () => {
      grid.savePositionsToStorage(
        'grid-positions',
        {
          1: { x: 5, y: 6 },
          2: { x: 'a', y: 6 }, // 坐标非法
          3: { x: 1, y: 2 }, // id 不在 items 中
          999: { x: 1, y: 2 }, // id 不在 items 中
        },
        [{ id: 1 }, { id: 2 }]
      );
      expect(JSON.parse(localStorage.getItem('grid-positions'))).toEqual({
        1: { x: 5, y: 6 },
      });
    });

    it('存储写入失败时仅告警不抛出', () => {
      // jsdom 的 Storage 是 Proxy 包装，无法对 setItem 单独 spy，
      // 需整体替换 localStorage 模拟配额超限
      vi.stubGlobal('localStorage', {
        getItem: () => null,
        setItem: () => {
          throw new Error('quota exceeded');
        },
        removeItem: () => {},
      });
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() =>
        grid.savePositionsToStorage('grid-positions', { 1: { x: 1, y: 2 } })
      ).not.toThrow();
      expect(consoleError).toHaveBeenCalledWith(
        'useDesktopGrid.savePositionsToStorage error',
        expect.any(Error)
      );
    });
  });

  describe('loadPositionsFromStorage', () => {
    it('无存储数据时返回空对象', () => {
      expect(grid.loadPositionsFromStorage('grid-positions')).toEqual({});
    });

    it('恢复持久化位置并过滤未知 id / 非法坐标', () => {
      localStorage.setItem(
        'grid-positions',
        JSON.stringify({
          1: { x: 20, y: 20 },
          2: { x: 1 }, // 缺 y
          3: { x: 30, y: 40 }, // id 不在 items 中
        })
      );
      expect(
        grid.loadPositionsFromStorage('grid-positions', [{ id: 1 }])
      ).toEqual({ 1: { x: 20, y: 20 } });
    });

    it('存储内容损坏时告警并返回空对象', () => {
      localStorage.setItem('grid-positions', '{broken json');
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      expect(
        grid.loadPositionsFromStorage('grid-positions', [{ id: 1 }])
      ).toEqual({});
      expect(consoleError).toHaveBeenCalledWith(
        'useDesktopGrid.loadPositionsFromStorage error',
        expect.any(Error)
      );
    });
  });
});

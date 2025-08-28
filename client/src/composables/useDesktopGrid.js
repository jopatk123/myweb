// Composable: provide helpers for desktop icon grid and persistence
export default function useDesktopGrid() {
  const GRID = { originX: 20, originY: 20, cellW: 88, cellH: 88, maxRows: 8 };

  function positionToCell(pos) {
    const col = Math.max(0, Math.round((pos.x - GRID.originX) / GRID.cellW));
    const row = Math.max(0, Math.round((pos.y - GRID.originY) / GRID.cellH));
    return { col, row };
  }

  function cellToPosition(cell) {
    return {
      x: GRID.originX + cell.col * GRID.cellW,
      y: GRID.originY + cell.row * GRID.cellH,
    };
  }

  function getOccupiedCellKeys(positions, excludeId) {
    const set = new Set();
    const excludeIds = Array.isArray(excludeId) ? excludeId : [excludeId];
    for (const [k, v] of Object.entries(positions || {})) {
      if (excludeIds.includes(Number(k))) continue;
      if (!v) continue;
      const c = positionToCell(v);
      set.add(`${c.col}:${c.row}`);
    }
    return set;
  }

  function findNextFreeCell(desiredCell, occupied) {
    let { col, row } = desiredCell;
    for (let i = 0; i < 10000; i++) {
      const key = `${col}:${row}`;
      if (!occupied.has(key)) return { col, row };
      row += 1;
      if (row > GRID.maxRows * 5) {
        row = 0;
        col += 1;
      }
    }
    return desiredCell;
  }

  function finalizeDragForPositions(positionsRef, idOrIds) {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    const updated = { ...positionsRef.value };
    const occupiedBase = getOccupiedCellKeys(updated, ids);
    for (const id of ids) {
      const p = positionsRef.value?.[id];
      if (!p) continue;
      const desired = positionToCell(p);
      const cell = findNextFreeCell(desired, occupiedBase);
      updated[id] = cellToPosition(cell);
      occupiedBase.add(
        `${positionToCell(updated[id]).col}:${positionToCell(updated[id]).row}`
      );
    }
    positionsRef.value = updated;
  }

  function savePositionsToStorage(storageKey, positions, items = []) {
    try {
      const validIds = new Set((items || []).map(a => a.id));
      const data = {};
      for (const [k, v] of Object.entries(positions || {})) {
        if (
          validIds.has(Number(k)) &&
          v &&
          typeof v.x === 'number' &&
          typeof v.y === 'number'
        )
          data[k] = v;
      }
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      // surface errors to console to help debugging
      // do not throw to avoid breaking UI

      console.error('useDesktopGrid.savePositionsToStorage error', e);
    }
  }

  function loadPositionsFromStorage(storageKey, items = []) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return {};
      const data = JSON.parse(raw);
      const validIds = new Set((items || []).map(a => a.id));
      const filtered = {};
      for (const [k, v] of Object.entries(data || {})) {
        if (
          validIds.has(Number(k)) &&
          v &&
          typeof v.x === 'number' &&
          typeof v.y === 'number'
        )
          filtered[k] = { x: v.x, y: v.y };
      }
      return filtered;
    } catch (e) {
      console.error('useDesktopGrid.loadPositionsFromStorage error', e);
      return {};
    }
  }

  return {
    GRID,
    positionToCell,
    cellToPosition,
    getOccupiedCellKeys,
    findNextFreeCell,
    finalizeDragForPositions,
    savePositionsToStorage,
    loadPositionsFromStorage,
  };
}

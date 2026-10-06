import { ref, computed, watch, getCurrentScope, onScopeDispose } from 'vue';
import { notebookApi } from '../api/notebook.js';
import { unwrapData } from '../api/httpClient.js';
import { generateId } from '../utils/idGenerator.js';
import { parseServerDate } from '@/utils/datetime.js';
import { readJsonStorageItem, writeJsonStorageItem } from '@/utils/storage.js';

const SERVER_RECOVERY_INTERVAL_MS = 30000;
const TOMBSTONE_STORAGE_KEY = 'notebook-deleted-ids';

export function useNotebook() {
  const notes = ref([]);
  const compactView = ref(false);
  const serverReady = ref(true);
  const displayLimit = ref(50);
  const loading = ref(false);
  const error = ref(null);

  const completedCount = computed(
    () => notes.value.filter(note => note.completed).length
  );

  const pendingCount = computed(
    () => notes.value.filter(note => !note.completed).length
  );

  // 服务端 SQLite 时间戳（'YYYY-MM-DD HH:MM:SS'，UTC 无时区标记）
  // 统一归一为 ISO 字符串，避免 Safari 等环境解析出 Invalid Date
  function normalizeTimestamp(value, fallback) {
    if (!value) return fallback;
    const date = parseServerDate(value);
    return date ? date.toISOString() : value;
  }

  function normalizeNote(row = {}) {
    const createdAt = normalizeTimestamp(
      row.createdAt || row.created_at,
      new Date().toISOString()
    );
    const updatedAt = normalizeTimestamp(
      row.updatedAt || row.updated_at || row.createdAt || row.created_at,
      createdAt
    );
    return {
      id: row.id ?? generateId(),
      title: row.title || '',
      description: row.description || '',
      category: row.category || '',
      priority: row.priority || 'medium',
      completed: !!(row.completed === true || row.completed === 1),
      createdAt,
      updatedAt,
    };
  }

  function buildPayload(noteData, completed = false) {
    return {
      title: noteData.title?.trim() || '',
      description: noteData.description?.trim() || '',
      priority: noteData.priority || 'medium',
      category: noteData.category?.trim() || '',
      completed,
    };
  }

  function saveToStorage() {
    writeJsonStorageItem('notebook-notes', notes.value, storageError => {
      console.error('保存笔记失败:', storageError);
    });
  }

  function readLocalMirror() {
    const saved = readJsonStorageItem('notebook-notes', [], storageError => {
      console.error('加载本地笔记失败:', storageError);
    });
    return Array.isArray(saved) ? saved.map(normalizeNote) : [];
  }

  function loadFromStorage() {
    notes.value = readLocalMirror();
  }

  /**
   * 离线删除的墓碑记录：服务端笔记（数字 id）在本地被删除后，
   * 联网加载时需回传删除，且在回传成功前不能让该笔记从服务端数据中"复活"。
   */
  function readTombstones() {
    const ids = readJsonStorageItem(TOMBSTONE_STORAGE_KEY, [], storageError => {
      console.error('加载删除记录失败:', storageError);
    });
    return Array.isArray(ids) ? ids.filter(id => typeof id === 'number') : [];
  }

  function writeTombstones(ids) {
    writeJsonStorageItem(TOMBSTONE_STORAGE_KEY, ids, storageError => {
      console.error('保存删除记录失败:', storageError);
    });
  }

  function recordTombstone(noteId) {
    if (typeof noteId !== 'number') return;
    const ids = readTombstones();
    if (!ids.includes(noteId)) {
      ids.push(noteId);
      writeTombstones(ids);
    }
  }

  function saveViewSettingsToStorage() {
    writeJsonStorageItem(
      'notebook-compact-view',
      compactView.value,
      storageError => {
        console.error('保存视图设置失败:', storageError);
      }
    );
  }

  function loadViewSettingsFromStorage() {
    compactView.value = readJsonStorageItem(
      'notebook-compact-view',
      compactView.value,
      storageError => {
        console.error('加载视图设置失败:', storageError);
      }
    );
  }

  function persistLocalMirror() {
    saveToStorage();
  }

  function isApiResponseError(requestError) {
    return requestError?.name === 'ApiError' || !!requestError?.payload;
  }

  function shouldFallbackToLocal(requestError) {
    return !isApiResponseError(requestError);
  }

  function resolveRequestErrorMessage(requestError, fallbackMessage) {
    return (
      requestError?.payload?.message || requestError?.message || fallbackMessage
    );
  }

  function upsertLocalNote(noteData, editingNote = null) {
    if (editingNote) {
      const index = notes.value.findIndex(note => note.id === editingNote.id);
      if (index !== -1) {
        notes.value[index] = normalizeNote({
          ...notes.value[index],
          ...noteData,
          id: editingNote.id,
          updatedAt: new Date().toISOString(),
        });
      }
      return;
    }

    notes.value.unshift(
      normalizeNote({
        id: generateId(),
        ...noteData,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );
  }

  /**
   * 拉取服务端全量笔记：分页循环直到取满 total，
   * 保证本地过滤/统计基于完整数据（服务端单页上限 200）。
   */
  async function fetchAllServerNotes() {
    const pageSize = 200;
    const first = unwrapData(
      await notebookApi.list({ page: 1, limit: pageSize })
    );
    const firstItems = Array.isArray(first) ? first : first?.items || [];
    const total = Array.isArray(first)
      ? firstItems.length
      : Number(first?.total) || firstItems.length;

    const items = [...firstItems];
    while (items.length < total) {
      const page = Math.floor(items.length / pageSize) + 1;
      const next = unwrapData(
        await notebookApi.list({ page, limit: pageSize })
      );
      const nextItems = Array.isArray(next) ? next : next?.items || [];
      if (nextItems.length === 0) break;
      items.push(...nextItems);
    }
    return items;
  }

  /**
   * 联网加载时把本地离线变更回传服务端，再合并出最终列表：
   * - 离线删除（tombstone）：逐条回传 remove；网络失败保留墓碑并继续在展示层隐藏；
   * - 离线新建（字符串 id）：回传 create，成功后以服务端行替换本地记录；
   * - 离线修改（数字 id 且 updatedAt 较新）：回传 update，失败时沿用本地较新版本（下次再推）；
   * - 推送成功后以服务端返回行覆盖本地镜像，避免时钟偏差导致的重复推送。
   */
  async function syncLocalChanges(serverNotes) {
    const result = [...serverNotes];
    const serverById = new Map(serverNotes.map(note => [note.id, note]));

    // 1. 回传离线删除
    const tombstones = readTombstones();
    const keptTombstones = [];
    for (const id of tombstones) {
      try {
        await notebookApi.remove(id);
      } catch (requestError) {
        // 服务端已明确响应（如 404 笔记不存在）视为删除完成，丢弃墓碑
        if (!isApiResponseError(requestError)) {
          keptTombstones.push(id);
        }
      }
    }
    writeTombstones(keptTombstones);
    // 墓碑 id 一律不进合并结果：推送成功/服务端已删除的条目，
    // 以及推送失败仍需隐藏的条目，都不能再出现在列表中
    const hiddenIds = new Set(tombstones);

    const mirror = readLocalMirror();

    // 2. 回传离线新建（字符串 id）
    for (const local of mirror) {
      if (typeof local.id === 'number') continue;
      try {
        const raw = await notebookApi.create(
          buildPayload(local, local.completed)
        );
        result.unshift(normalizeNote(unwrapData(raw) || {}));
      } catch {
        // 推送失败：保留本地记录，等待下次联网重试
        result.push(local);
      }
    }

    // 3. 回传离线修改（本地 updatedAt 比服务端行新）
    for (const local of mirror) {
      if (typeof local.id !== 'number') continue;
      const server = serverById.get(local.id);
      if (!server) continue;
      if (
        new Date(local.updatedAt).getTime() <=
        new Date(server.updatedAt).getTime()
      ) {
        continue;
      }
      const index = result.findIndex(note => note.id === local.id);
      try {
        const raw = await notebookApi.update(
          local.id,
          buildPayload(local, local.completed)
        );
        if (index !== -1) {
          result[index] = normalizeNote(unwrapData(raw) || {});
        }
      } catch {
        // 推送失败：本地较新版本继续胜出（与原合并行为一致）
        if (index !== -1) {
          result[index] = local;
        }
      }
    }

    // 墓碑对应的笔记一律隐藏，防止"复活"
    return result
      .filter(note => !hiddenIds.has(note.id))
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
      );
  }

  async function loadNotes() {
    loading.value = true;
    error.value = null;

    try {
      const items = await fetchAllServerNotes();
      const serverNotes = items.map(normalizeNote);
      notes.value = await syncLocalChanges(serverNotes);
      persistLocalMirror();
      serverReady.value = true;
      return true;
    } catch (requestError) {
      const message = resolveRequestErrorMessage(requestError, '加载失败');
      if (!shouldFallbackToLocal(requestError)) {
        console.warn('加载服务器笔记被拒绝：', message);
        error.value = message;
        return false;
      }

      console.warn('加载服务器笔记失败，回退本地：', message);
      serverReady.value = false;
      error.value = '服务器暂不可用，已切换到本地笔记';
      loadFromStorage();
      return true;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 保存笔记。options.completed 用于撤销删除等场景显式指定完成状态；
   * 默认编辑时沿用原笔记状态，新建为未完成。
   */
  async function saveNote(
    noteData,
    editingNote = null,
    { completed = editingNote?.completed ?? false } = {}
  ) {
    error.value = null;
    const payload = buildPayload(noteData, completed);

    try {
      if (serverReady.value && typeof editingNote?.id === 'number') {
        const raw = await notebookApi.update(editingNote.id, payload);
        const row = normalizeNote(unwrapData(raw) || {});
        const index = notes.value.findIndex(note => note.id === editingNote.id);
        if (index !== -1) {
          notes.value[index] = row;
        }
      } else if (serverReady.value) {
        const raw = await notebookApi.create(payload);
        const row = normalizeNote(unwrapData(raw) || {});
        // 编辑的是离线创建的本地笔记（字符串 id）：服务端已新建对应记录，
        // 必须移除旧本地记录，否则列表出现重复笔记
        if (editingNote) {
          notes.value = notes.value.filter(note => note.id !== editingNote.id);
        }
        notes.value.unshift(row);
      } else {
        upsertLocalNote(payload, editingNote);
      }

      if (serverReady.value) {
        persistLocalMirror();
      } else {
        saveToStorage();
      }
      return true;
    } catch (requestError) {
      const message = resolveRequestErrorMessage(requestError, '保存失败');
      if (!shouldFallbackToLocal(requestError)) {
        console.warn('保存笔记被服务器拒绝：', message);
        error.value = message;
        return false;
      }

      console.warn('保存到服务器失败，回退本地：', message);
      serverReady.value = false;
      error.value = '保存失败，已切换到本地模式';
      upsertLocalNote(payload, editingNote);
      saveToStorage();
      return true;
    }
  }

  async function deleteNote(noteId) {
    error.value = null;
    const isServerNote = typeof noteId === 'number';

    if (serverReady.value && isServerNote) {
      try {
        await notebookApi.remove(noteId);
        notes.value = notes.value.filter(note => note.id !== noteId);
        persistLocalMirror();
        return true;
      } catch (requestError) {
        const message = resolveRequestErrorMessage(requestError, '删除失败');
        if (!shouldFallbackToLocal(requestError)) {
          console.warn('删除笔记被服务器拒绝：', message);
          error.value = message;
          return false;
        }

        console.warn('删除服务器笔记失败，继续删除本地：', message);
        serverReady.value = false;
        error.value = '删除时网络异常，已同步本地结果';
      }
    }

    // 本地删除：服务端笔记记录墓碑，联网后回传删除，防止下次加载时"复活"
    if (isServerNote) {
      recordTombstone(noteId);
    }
    notes.value = notes.value.filter(note => note.id !== noteId);
    saveToStorage();
    return true;
  }

  /**
   * 批量删除：在线时服务端笔记走单次 bulk-delete 请求；
   * 失败或离线时逐条走 deleteNote（含墓碑与本地回退逻辑）。
   * 返回实际删除成功的 id 列表，供调用方实现精确撤销。
   */
  async function deleteNotes(noteIds) {
    error.value = null;
    const ids = (Array.isArray(noteIds) ? noteIds : []).filter(
      id => typeof id === 'number'
    );
    const removed = [];

    if (serverReady.value && ids.length > 0) {
      try {
        await notebookApi.bulkRemove([...new Set(ids)]);
        const removedSet = new Set(ids);
        notes.value = notes.value.filter(note => !removedSet.has(note.id));
        persistLocalMirror();
        removed.push(...ids);
      } catch (requestError) {
        const message = resolveRequestErrorMessage(
          requestError,
          '批量删除失败'
        );
        if (!shouldFallbackToLocal(requestError)) {
          console.warn('批量删除笔记被服务器拒绝：', message);
          error.value = message;
          return removed;
        }

        console.warn('批量删除服务器笔记失败，回退逐条本地删除：', message);
        serverReady.value = false;
        error.value = '批量删除失败，已切换到本地模式';
      }
    }

    for (const id of noteIds) {
      if (removed.includes(id)) continue;
      if (await deleteNote(id)) removed.push(id);
    }
    return removed;
  }

  async function toggleNoteStatus(noteId) {
    error.value = null;
    const index = notes.value.findIndex(note => note.id === noteId);

    if (index === -1) {
      return;
    }

    const note = notes.value[index];
    const completed = !note.completed;

    try {
      if (serverReady.value && typeof noteId === 'number') {
        const raw = await notebookApi.update(noteId, { completed });
        notes.value[index] = normalizeNote(unwrapData(raw) || {});
        persistLocalMirror();
        return true;
      } else {
        notes.value[index] = normalizeNote({
          ...note,
          completed,
          updatedAt: new Date().toISOString(),
        });
        saveToStorage();
        return true;
      }
    } catch (requestError) {
      const message = resolveRequestErrorMessage(requestError, '状态更新失败');
      if (!shouldFallbackToLocal(requestError)) {
        console.warn('更新完成状态被服务器拒绝：', message);
        error.value = message;
        return false;
      }

      console.warn('更新完成状态失败，回退本地：', message);
      serverReady.value = false;
      error.value = '状态更新失败，已切换到本地模式';
      notes.value[index] = normalizeNote({
        ...note,
        completed,
        updatedAt: new Date().toISOString(),
      });
      saveToStorage();
      return true;
    }
  }

  async function quickAddNote(text) {
    if (!text.trim()) {
      return false;
    }

    try {
      const isHighPriority = text.includes('!');
      let title = text.replace(/!/g, '').trim();
      let description = '';

      const descMatch = title.match(/\/\/(.+)$/);
      if (descMatch) {
        description = descMatch[1].trim();
        title = title.replace(descMatch[0], '').trim();
      }

      return await saveNote({
        title,
        description,
        priority: isHighPriority ? 'high' : 'medium',
      });
    } catch (requestError) {
      console.error('快速添加失败:', requestError);
      throw requestError;
    }
  }

  function loadMoreNotes() {
    displayLimit.value += 50;
  }

  function resetDisplayLimit() {
    displayLimit.value = 50;
  }

  /**
   * 撤销删除：按原笔记内容重新创建（在线时服务端会分配新 id，
   * 离线时本地生成新字符串 id），完成状态保持不变。
   */
  async function restoreNote(note) {
    if (!note) return false;
    return saveNote(
      {
        title: note.title,
        description: note.description,
        category: note.category,
        priority: note.priority,
      },
      null,
      { completed: note.completed }
    );
  }

  // —— 掉线自动恢复：serverReady 变 false 后周期性探活，
  // 恢复后自动重新加载并回传离线期间的全部变更 ——
  let recoveryTimer = null;

  function stopServerRecovery() {
    if (recoveryTimer !== null) {
      clearInterval(recoveryTimer);
      recoveryTimer = null;
    }
  }

  function scheduleServerRecovery() {
    if (recoveryTimer !== null) return;
    recoveryTimer = setInterval(async () => {
      if (serverReady.value) {
        stopServerRecovery();
        return;
      }
      try {
        await notebookApi.list({ page: 1, limit: 1 });
      } catch {
        return; // 仍不可用，继续等待下一轮
      }
      stopServerRecovery();
      serverReady.value = true;
      error.value = null;
      await loadNotes();
    }, SERVER_RECOVERY_INTERVAL_MS);
  }

  watch(serverReady, ready => {
    if (ready) {
      stopServerRecovery();
    } else {
      scheduleServerRecovery();
    }
  });

  if (getCurrentScope()) {
    onScopeDispose(stopServerRecovery);
  }

  async function initializeData() {
    loadViewSettingsFromStorage();
    await loadNotes();
  }

  watch(compactView, saveViewSettingsToStorage);

  return {
    notes,
    compactView,
    serverReady,
    displayLimit,
    loading,
    error,
    completedCount,
    pendingCount,
    saveNote,
    deleteNote,
    deleteNotes,
    restoreNote,
    toggleNoteStatus,
    quickAddNote,
    loadMoreNotes,
    resetDisplayLimit,
    initializeData,
    stopServerRecovery,
  };
}

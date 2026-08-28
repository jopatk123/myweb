import { ref, computed, watch } from 'vue';
import { notebookApi } from '../api/notebook.js';
import { unwrapData } from '../api/httpClient.js';
import { generateId } from '../utils/idGenerator.js';
import { parseServerDate } from '@/utils/datetime.js';
import { readJsonStorageItem, writeJsonStorageItem } from '@/utils/storage.js';

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

  function loadFromStorage() {
    const saved = readJsonStorageItem('notebook-notes', [], storageError => {
      console.error('加载本地笔记失败:', storageError);
    });
    notes.value = Array.isArray(saved) ? saved.map(normalizeNote) : [];
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
   * 合并服务器数据与本地镜像：
   * - 离线期间新建的笔记（字符串 id，服务端不存在）必须保留，避免被覆盖丢失；
   * - 离线期间对已有笔记的本地修改按 updatedAt 较新者胜出（单用户场景）。
   */
  function mergeWithLocalMirror(serverNotes) {
    const saved = readJsonStorageItem('notebook-notes', [], storageError => {
      console.error('加载本地笔记失败:', storageError);
    });
    if (!Array.isArray(saved) || saved.length === 0) {
      return [...serverNotes];
    }

    const merged = [...serverNotes];
    const serverById = new Map(serverNotes.map(note => [note.id, note]));
    for (const raw of saved) {
      const local = normalizeNote(raw);
      if (typeof local.id !== 'number') {
        if (!merged.some(note => note.id === local.id)) {
          merged.push(local);
        }
        continue;
      }
      const server = serverById.get(local.id);
      if (
        server &&
        new Date(local.updatedAt).getTime() >
          new Date(server.updatedAt).getTime()
      ) {
        const index = merged.findIndex(note => note.id === local.id);
        if (index !== -1) {
          merged[index] = local;
        }
      }
    }

    return merged.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }

  async function loadNotes() {
    loading.value = true;
    error.value = null;

    try {
      const items = await fetchAllServerNotes();
      const serverNotes = items.map(normalizeNote);
      notes.value = mergeWithLocalMirror(serverNotes);
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

  async function saveNote(noteData, editingNote = null) {
    error.value = null;
    const payload = buildPayload(
      noteData,
      editingNote ? editingNote.completed : false
    );

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

    try {
      if (serverReady.value && typeof noteId === 'number') {
        await notebookApi.remove(noteId);
        notes.value = notes.value.filter(note => note.id !== noteId);
        persistLocalMirror();
        return true;
      }
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
      notes.value = notes.value.filter(note => note.id !== noteId);
      saveToStorage();
      return true;
    }

    notes.value = notes.value.filter(note => note.id !== noteId);
    saveToStorage();
    return true;
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
    toggleNoteStatus,
    quickAddNote,
    loadMoreNotes,
    resetDisplayLimit,
    initializeData,
  };
}

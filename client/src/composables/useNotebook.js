import { ref, computed, watch } from 'vue';
import { notebookApi } from '../api/notebook.js';
import { unwrapData } from '../api/httpClient.js';
import { generateId } from '../utils/idGenerator.js';
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

  function normalizeNote(row = {}) {
    return {
      id: row.id ?? generateId(),
      title: row.title || '',
      description: row.description || '',
      category: row.category || '',
      priority: row.priority || 'medium',
      completed: !!(row.completed === true || row.completed === 1),
      createdAt: row.createdAt || row.created_at || new Date().toISOString(),
      updatedAt:
        row.updatedAt ||
        row.updated_at ||
        row.createdAt ||
        row.created_at ||
        new Date().toISOString(),
    };
  }

  function buildPayload(noteData, completed = false) {
    return {
      title: noteData.title?.trim() || '',
      description: noteData.description?.trim() || '',
      priority: noteData.priority || 'medium',
      category: '',
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

  async function loadNotes() {
    loading.value = true;
    error.value = null;

    try {
      const raw = await notebookApi.list();
      const data = unwrapData(raw);
      const items = Array.isArray(data) ? data : data?.items || [];
      notes.value = items.map(normalizeNote);
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

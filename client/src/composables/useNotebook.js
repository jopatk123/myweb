import { ref, computed, watch } from 'vue';
import { notebookApi } from '../api/notebook.js';

export function useNotebook() {
  // 响应式数据
  const notes = ref([]);
  const categories = ref(['工作', '个人', '学习', '购物']);
  const compactView = ref(false);
  const serverReady = ref(true);
  const displayLimit = ref(50);

  // 计算属性
  const completedCount = computed(
    () => notes.value.filter(note => note.completed).length
  );

  const pendingCount = computed(
    () => notes.value.filter(note => !note.completed).length
  );

  // 方法
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function normalizeNote(row) {
    // 确保和前端使用的字段对齐
    return {
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      category: row.category || '',
      priority: row.priority || 'medium',
      completed: !!(row.completed === true || row.completed === 1),
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
    };
  }

  async function saveNote(noteData, editingNote = null) {
    try {
      if (serverReady.value) {
        if (editingNote) {
          const res = await notebookApi.update(editingNote.id, noteData);
          const row = res.data;
          const idx = notes.value.findIndex(n => n.id === row.id);
          if (idx !== -1) notes.value[idx] = normalizeNote(row);
        } else {
          const res = await notebookApi.create(noteData);
          const row = res.data;
          notes.value.unshift(normalizeNote(row));
        }
        persistLocalMirror();
      } else {
        // 回退：本地
        if (editingNote) {
          const index = notes.value.findIndex(
            note => note.id === editingNote.id
          );
          if (index !== -1) {
            notes.value[index] = {
              ...notes.value[index],
              ...noteData,
              updatedAt: new Date().toISOString(),
            };
          }
        } else {
          const newNote = {
            id: generateId(),
            ...noteData,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          notes.value.unshift(newNote);
        }
        saveToStorage();
      }
    } catch (e) {
      console.warn('保存到服务器失败，回退本地：', e?.message || e);
      serverReady.value = false;
      // 回退
      if (editingNote) {
        const index = notes.value.findIndex(note => note.id === editingNote.id);
        if (index !== -1) {
          notes.value[index] = {
            ...notes.value[index],
            ...noteData,
            updatedAt: new Date().toISOString(),
          };
        }
      } else {
        const newNote = {
          id: generateId(),
          ...noteData,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        notes.value.unshift(newNote);
      }
      saveToStorage();
    }
  }

  async function deleteNote(noteId) {
    try {
      if (serverReady.value && typeof noteId === 'number') {
        await notebookApi.remove(noteId);
      }
    } catch (e) {
      console.warn('删除服务器笔记失败，继续删除本地：', e?.message || e);
      serverReady.value = false;
    } finally {
      const index = notes.value.findIndex(note => note.id === noteId);
      if (index !== -1) {
        notes.value.splice(index, 1);
        serverReady.value ? persistLocalMirror() : saveToStorage();
      }
    }
  }

  async function toggleNoteStatus(noteId) {
    const note = notes.value.find(n => n.id === noteId);
    if (!note) return;
    const target = { ...note, completed: !note.completed };
    try {
      if (serverReady.value && typeof noteId === 'number') {
        const res = await notebookApi.update(noteId, {
          completed: target.completed,
        });
        const row = normalizeNote(res.data);
        const idx = notes.value.findIndex(n => n.id === noteId);
        if (idx !== -1) notes.value[idx] = row;
        persistLocalMirror();
      } else {
        const idx = notes.value.findIndex(n => n.id === noteId);
        if (idx !== -1) {
          notes.value[idx] = {
            ...notes.value[idx],
            completed: target.completed,
            updatedAt: new Date().toISOString(),
          };
          saveToStorage();
        }
      }
    } catch (e) {
      console.warn('更新完成状态失败，回退本地：', e?.message || e);
      serverReady.value = false;
      const idx = notes.value.findIndex(n => n.id === noteId);
      if (idx !== -1) {
        notes.value[idx] = {
          ...notes.value[idx],
          completed: target.completed,
          updatedAt: new Date().toISOString(),
        };
        saveToStorage();
      }
    }
  }

  function addCategory(categoryName) {
    if (categoryName && !categories.value.includes(categoryName)) {
      categories.value.push(categoryName);
      saveCategoriesToStorage();
    }
  }

  function quickAddNote(text) {
    if (text.trim()) {
      const newNote = {
        id: generateId(),
        title: text,
        description: '',
        category: '',
        priority: 'medium',
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      notes.value.unshift(newNote);
      saveToStorage();
    }
  }

  function loadMoreNotes() {
    displayLimit.value += 50;
  }

  function resetDisplayLimit() {
    displayLimit.value = 50;
  }

  // 存储相关方法
  function saveToStorage() {
    try {
      localStorage.setItem('notebook-notes', JSON.stringify(notes.value));
    } catch (error) {
      console.error('保存笔记失败:', error);
    }
  }

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem('notebook-notes');
      if (saved) {
        notes.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      notes.value = [];
    }
  }

  function saveCategoriesToStorage() {
    try {
      localStorage.setItem(
        'notebook-categories',
        JSON.stringify(categories.value)
      );
    } catch (error) {
      console.error('保存分类失败:', error);
    }
  }

  function loadCategoriesFromStorage() {
    try {
      const saved = localStorage.getItem('notebook-categories');
      if (saved) {
        categories.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  }

  function saveViewSettingsToStorage() {
    try {
      localStorage.setItem(
        'notebook-compact-view',
        JSON.stringify(compactView.value)
      );
    } catch (error) {
      console.error('保存视图设置失败:', error);
    }
  }

  function loadViewSettingsFromStorage() {
    try {
      const saved = localStorage.getItem('notebook-compact-view');
      if (saved) {
        compactView.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error('加载视图设置失败:', error);
    }
  }

  function persistLocalMirror() {
    try {
      localStorage.setItem('notebook-notes', JSON.stringify(notes.value));
    } catch (e) {
      console.warn('持久化本地镜像失败：', e?.message || e);
    }
  }

  async function loadNotes() {
    try {
      const res = await notebookApi.list();
      const items = res.data?.items || [];
      notes.value = items.map(normalizeNote);
      persistLocalMirror();
      serverReady.value = true;
    } catch (e) {
      console.warn('加载服务器笔记失败，回退本地：', e?.message || e);
      serverReady.value = false;
      loadFromStorage();
    }
  }

  function initializeData() {
    loadNotes();
    loadCategoriesFromStorage();
    loadViewSettingsFromStorage();
  }

  // 监听数据变化自动保存
  watch(categories, saveCategoriesToStorage, { deep: true });
  watch(compactView, saveViewSettingsToStorage);

  return {
    // 响应式数据
    notes,
    categories,
    compactView,
    serverReady,
    displayLimit,

    // 计算属性
    completedCount,
    pendingCount,

    // 方法
    saveNote,
    deleteNote,
    toggleNoteStatus,
    addCategory,
    quickAddNote,
    loadMoreNotes,
    resetDisplayLimit,
    initializeData,
  };
}

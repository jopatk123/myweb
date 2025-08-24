<template>
  <div class="notebook-app" @click.self="focusApp" ref="appEl" tabindex="0">
    <NotebookHeader
      :total-count="notes.length"
      :completed-count="completedCount"
      :pending-count="pendingCount"
    />

    <div class="notebook-container">
      <NotebookToolbar
        v-model:search="searchQuery"
        v-model:filter="filterStatus"
        v-model:category="selectedCategory"
        :categories="categories"
        @add-note="showAddForm = true"
      />

      <div class="notebook-content">
        <NotebookForm
          v-if="showAddForm || editingNote"
          :note="editingNote"
          :categories="categories"
          @save="handleSaveNote"
          @cancel="handleCancelEdit"
          @add-category="handleAddCategory"
        />

        <NotebookList
          v-if="filteredNotes.length > 0"
          :notes="filteredNotes"
          @edit="handleEditNote"
          @delete="handleDeleteNote"
          @toggle-status="handleToggleStatus"
        />

        <NotebookEmptyState
          v-else-if="!showAddForm"
          :has-notes="notes.length > 0"
          :search-query="searchQuery"
          @add-note="showAddForm = true"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import NotebookHeader from './NotebookHeader.vue';
  import NotebookToolbar from './NotebookToolbar.vue';
  import NotebookForm from './NotebookForm.vue';
  import NotebookList from './NotebookList.vue';
  import NotebookEmptyState from './NotebookEmptyState.vue';

  // 响应式数据
  const appEl = ref(null);
  const notes = ref([]);
  const searchQuery = ref('');
  const filterStatus = ref('all'); // all, pending, completed
  const selectedCategory = ref('all');
  const showAddForm = ref(false);
  const editingNote = ref(null);
  const categories = ref(['工作', '个人', '学习', '购物']);

  // 计算属性
  const completedCount = computed(
    () => notes.value.filter(note => note.completed).length
  );

  const pendingCount = computed(
    () => notes.value.filter(note => !note.completed).length
  );

  const filteredNotes = computed(() => {
    let filtered = notes.value;

    // 按状态筛选
    if (filterStatus.value === 'pending') {
      filtered = filtered.filter(note => !note.completed);
    } else if (filterStatus.value === 'completed') {
      filtered = filtered.filter(note => note.completed);
    }

    // 按分类筛选
    if (selectedCategory.value !== 'all') {
      filtered = filtered.filter(
        note => note.category === selectedCategory.value
      );
    }

    // 按搜索关键词筛选
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        note =>
          note.title.toLowerCase().includes(query) ||
          (note.description && note.description.toLowerCase().includes(query))
      );
    }

    // 按状态和创建时间排序
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1; // 未完成的在前
      }
      return new Date(b.createdAt) - new Date(a.createdAt); // 新创建的在前
    });
  });

  // 方法
  function focusApp() {
    if (appEl.value && typeof appEl.value.focus === 'function') {
      appEl.value.focus();
    }
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function handleSaveNote(noteData) {
    if (editingNote.value) {
      // 编辑现有笔记
      const index = notes.value.findIndex(
        note => note.id === editingNote.value.id
      );
      if (index !== -1) {
        notes.value[index] = {
          ...notes.value[index],
          ...noteData,
          updatedAt: new Date().toISOString(),
        };
      }
      editingNote.value = null;
    } else {
      // 创建新笔记
      const newNote = {
        id: generateId(),
        ...noteData,
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      notes.value.unshift(newNote);
    }
    showAddForm.value = false;
    saveToStorage();
  }

  function handleCancelEdit() {
    showAddForm.value = false;
    editingNote.value = null;
  }

  function handleEditNote(note) {
    editingNote.value = { ...note };
    showAddForm.value = false;
  }

  function handleDeleteNote(noteId) {
    const index = notes.value.findIndex(note => note.id === noteId);
    if (index !== -1) {
      notes.value.splice(index, 1);
      saveToStorage();
    }
  }

  function handleToggleStatus(noteId) {
    const note = notes.value.find(note => note.id === noteId);
    if (note) {
      note.completed = !note.completed;
      note.updatedAt = new Date().toISOString();
      saveToStorage();
    }
  }

  function handleAddCategory(categoryName) {
    if (categoryName && !categories.value.includes(categoryName)) {
      categories.value.push(categoryName);
      saveCategoriesToStorage();
    }
  }

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

  // 监听数据变化自动保存
  watch(categories, saveCategoriesToStorage, { deep: true });

  // 组件挂载时加载数据
  onMounted(() => {
    loadFromStorage();
    loadCategoriesFromStorage();
    focusApp();
  });
</script>

<style scoped>
  .notebook-app {
    display: block;
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    min-width: 0;
    max-height: 600px;
    display: flex;
    flex-direction: column;
  }

  .notebook-container {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-sizing: border-box;
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .notebook-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  @media (max-width: 768px) {
    .notebook-app {
      padding: 12px;
      min-width: 320px;
    }

    .notebook-container {
      padding: 12px;
    }
  }
</style>

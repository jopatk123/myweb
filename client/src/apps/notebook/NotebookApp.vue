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
        v-model:compact-view="compactView"
        :categories="categories"
        @add-note="showAddForm = true"
      />

      <div class="notebook-content">
        <!-- 快速添加输入框 -->
        <div v-if="!showAddForm && !editingNote" class="quick-add">
          <input
            v-model="quickAddText"
            type="text"
            placeholder="快速添加待办事项..."
            class="quick-add-input"
            @keyup.enter="handleQuickAdd"
            @focus="quickAddFocused = true"
            @blur="quickAddFocused = false"
          />
          <button
            v-if="quickAddText.trim() || quickAddFocused"
            class="quick-add-btn"
            @click="handleQuickAdd"
            :disabled="!quickAddText.trim()"
          >
            ➕
          </button>
        </div>

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
          :compact-view="compactView"
          @edit="handleEditNote"
          @delete="handleDeleteNote"
          @toggle-status="handleToggleStatus"
        />

        <!-- 加载更多按钮 -->
        <div v-if="hasMoreNotes" class="load-more">
          <button class="btn btn-load-more" @click="loadMoreNotes">
            加载更多 ({{ notes.length - displayLimit }} 条)
          </button>
        </div>

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
  const compactView = ref(false);
  const quickAddText = ref('');
  const quickAddFocused = ref(false);
  const displayLimit = ref(50); // 初始显示数量

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
    const sorted = filtered.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1; // 未完成的在前
      }
      return new Date(b.createdAt) - new Date(a.createdAt); // 新创建的在前
    });

    // 限制显示数量
    return sorted.slice(0, displayLimit.value);
  });

  const hasMoreNotes = computed(() => {
    let filtered = notes.value;

    // 应用相同的筛选逻辑
    if (filterStatus.value === 'pending') {
      filtered = filtered.filter(note => !note.completed);
    } else if (filterStatus.value === 'completed') {
      filtered = filtered.filter(note => note.completed);
    }

    if (selectedCategory.value !== 'all') {
      filtered = filtered.filter(
        note => note.category === selectedCategory.value
      );
    }

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        note =>
          note.title.toLowerCase().includes(query) ||
          (note.description && note.description.toLowerCase().includes(query))
      );
    }

    return filtered.length > displayLimit.value;
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

  function handleQuickAdd() {
    const text = quickAddText.value.trim();
    if (text) {
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
      quickAddText.value = '';
      saveToStorage();
    }
  }

  function loadMoreNotes() {
    displayLimit.value += 50;
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

  // 监听数据变化自动保存
  watch(categories, saveCategoriesToStorage, { deep: true });
  watch(compactView, saveViewSettingsToStorage);

  // 监听筛选条件变化，重置显示限制
  watch([searchQuery, filterStatus, selectedCategory], () => {
    displayLimit.value = 50;
  });

  // 组件挂载时加载数据
  onMounted(() => {
    loadFromStorage();
    loadCategoriesFromStorage();
    loadViewSettingsFromStorage();
    focusApp();
  });
</script>

<style scoped>
  .notebook-app {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    min-width: 0;
    min-height: 500px;
    max-height: 90vh;
  }

  .notebook-container {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-sizing: border-box;
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .notebook-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .quick-add {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    flex-shrink: 0;
  }

  .quick-add-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.9);
    color: #333;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .quick-add-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .quick-add-input::placeholder {
    color: #999;
  }

  .quick-add-btn {
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    background: linear-gradient(45deg, #4ade80, #22c55e);
    color: white;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 40px;
  }

  .quick-add-btn:hover:not(:disabled) {
    background: linear-gradient(45deg, #22c55e, #16a34a);
    transform: translateY(-1px);
  }

  .quick-add-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .load-more {
    display: flex;
    justify-content: center;
    padding: 16px;
    margin-top: 8px;
  }

  .btn-load-more {
    padding: 8px 20px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }

  .btn-load-more:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    .notebook-app {
      padding: 12px;
      min-width: 320px;
    }

    .notebook-container {
      padding: 12px;
    }

    .quick-add {
      padding: 6px;
    }

    .quick-add-input {
      padding: 6px 10px;
      font-size: 13px;
    }

    .quick-add-btn {
      padding: 6px 10px;
      min-width: 36px;
    }
  }
</style>

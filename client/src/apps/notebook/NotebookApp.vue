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
        <QuickAddNote
          v-if="!showAddForm && !editingNote"
          :on-quick-add="handleQuickAdd"
        />

        <NotebookForm
          v-if="showAddForm || editingNote"
          :note="editingNote"
          :categories="categories"
          @save="handleSaveNote"
          @cancel="handleCancelEdit"
          @add-category="handleAddCategory"
        />

        <!-- 始终渲染列表（即使过滤后为空），以便列表区域可以占满空间 -->
        <NotebookList
          :notes="filteredNotes"
          :compact-view="compactView"
          @edit="handleEditNote"
          @delete="handleDeleteNote"
          @toggle-status="handleToggleStatus"
        />

        <!-- 加载更多按钮 -->
        <LoadMoreButton
          :show="filteredNotes.length > 0 && hasMoreNotes"
          :remaining-count="notes.length - displayLimit"
          :on-load-more="loadMoreNotes"
        />

        <!-- 仅当完全没有任何笔记时显示空状态提示 -->
        <NotebookEmptyState
          v-if="notes.length === 0 && !showAddForm"
          :has-notes="notes.length > 0"
          :search-query="searchQuery"
          @add-note="showAddForm = true"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue';
  import NotebookHeader from './NotebookHeader.vue';
  import NotebookToolbar from './NotebookToolbar.vue';
  import NotebookForm from './NotebookForm.vue';
  import NotebookList from './NotebookList.vue';
  import NotebookEmptyState from './NotebookEmptyState.vue';
  import QuickAddNote from './QuickAddNote.vue';
  import LoadMoreButton from './LoadMoreButton.vue';
  import { useNotebook } from '../../composables/useNotebook.js';
  import { useNotebookFilters } from '../../composables/useNotebookFilters.js';
  import './NotebookApp.css';

  // 使用composables
  const {
    notes,
    categories,
    compactView,
    displayLimit,
    completedCount,
    pendingCount,
    saveNote,
    deleteNote,
    toggleNoteStatus,
    addCategory,
    quickAddNote,
    loadMoreNotes,
    resetDisplayLimit,
    initializeData,
  } = useNotebook();

  const {
    searchQuery,
    filterStatus,
    selectedCategory,
    filteredNotes,
    hasMoreNotes,
  } = useNotebookFilters(notes, displayLimit, resetDisplayLimit);

  // 本地状态
  const appEl = ref(null);
  const showAddForm = ref(false);
  const editingNote = ref(null);

  // 方法
  function focusApp() {
    if (appEl.value && typeof appEl.value.focus === 'function') {
      appEl.value.focus();
    }
  }

  async function handleSaveNote(noteData) {
    await saveNote(noteData, editingNote.value);
    showAddForm.value = false;
    editingNote.value = null;
  }

  function handleCancelEdit() {
    showAddForm.value = false;
    editingNote.value = null;
  }

  function handleEditNote(note) {
    editingNote.value = { ...note };
    showAddForm.value = false;
  }

  async function handleDeleteNote(noteId) {
    await deleteNote(noteId);
  }

  async function handleToggleStatus(noteId) {
    await toggleNoteStatus(noteId);
  }

  function handleAddCategory(categoryName) {
    addCategory(categoryName);
  }

  async function handleQuickAdd(text) {
    await quickAddNote(text);
  }

  // 组件挂载时初始化数据
  onMounted(() => {
    initializeData();
    focusApp();
  });
</script>

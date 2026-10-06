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
        v-model:category="filterCategory"
        v-model:filter-priority="filterPriority"
        v-model:sort-by="sortBy"
        v-model:compact-view="compactView"
        :categories="availableCategories"
        :completed-count="completedCount"
        @add-note="showAddForm = true"
        @clear-completed="handleClearCompleted"
      />

      <div class="notebook-content">
        <div v-if="loading" class="notebook-status-banner is-loading">
          正在加载笔记...
        </div>

        <div v-else-if="error" class="notebook-status-banner">
          {{ error }}
        </div>

        <div
          v-if="!serverReady && notes.length > 0"
          class="notebook-status-banner is-local"
        >
          当前处于本地模式，联网后新改动不会自动回传服务器。
        </div>

        <QuickAddNote :on-quick-add="handleQuickAdd" />

        <NotebookList
          :notes="filteredNotes"
          :compact-view="compactView"
          @edit="handleEditNote"
          @delete="handleDeleteNote"
          @toggle-status="handleToggleStatus"
        />

        <LoadMoreButton
          :show="filteredNotes.length > 0 && hasMoreNotes"
          :remaining-count="filteredTotal - displayLimit"
          :on-load-more="loadMoreNotes"
        />

        <NotebookEmptyState
          v-if="showEmptyState"
          :has-notes="notes.length > 0"
          :has-filters="hasActiveFilters"
          :search-query="searchQuery"
          @add-note="showAddForm = true"
          @clear-filters="clearFilters"
        />

        <Transition name="notebook-form">
          <div v-if="formOpen" class="form-overlay">
            <NotebookForm
              class="is-expanded"
              :note="editingNote"
              :categories="availableCategories"
              @save="handleSaveNote"
              @cancel="handleCancelEdit"
            />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import NotebookHeader from './NotebookHeader.vue';
  import NotebookToolbar from './NotebookToolbar.vue';
  import NotebookForm from './NotebookForm.vue';
  import NotebookList from './NotebookList.vue';
  import NotebookEmptyState from './NotebookEmptyState.vue';
  import QuickAddNote from './QuickAddNote.vue';
  import LoadMoreButton from './LoadMoreButton.vue';
  import { useNotebook } from '../../composables/useNotebook.js';
  import { useNotebookFilters } from '../../composables/useNotebookFilters.js';
  import { useGlobalToast } from '../../composables/useGlobalToast.js';
  import './NotebookApp.css';

  const {
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
  } = useNotebook();

  const {
    searchQuery,
    filterStatus,
    filterCategory,
    filterPriority,
    sortBy,
    availableCategories,
    filteredNotes,
    filteredTotal,
    hasMoreNotes,
    hasActiveFilters,
    clearFilters,
  } = useNotebookFilters(notes, displayLimit, resetDisplayLimit);

  const { showToast } = useGlobalToast();

  const appEl = ref(null);
  const showAddForm = ref(false);
  const editingNote = ref(null);

  const formOpen = computed(() => showAddForm.value || !!editingNote.value);

  // 无匹配时也展示空状态（此前仅在完全没有笔记时显示，
  // 筛选/搜索无结果时列表区域一片空白）
  const showEmptyState = computed(
    () =>
      !loading.value &&
      !error.value &&
      !formOpen.value &&
      filteredTotal.value === 0
  );

  function focusApp() {
    if (appEl.value && typeof appEl.value.focus === 'function') {
      appEl.value.focus();
    }
  }

  async function handleSaveNote(noteData) {
    const saved = await saveNote(noteData, editingNote.value);
    if (!saved) {
      return;
    }

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

  async function handleDeleteNote(note) {
    const ok = await deleteNote(note.id);
    if (!ok) return;

    const title = note.title?.trim() || '未命名笔记';
    showToast(`已删除「${title}」`, 'info', 5000, {
      text: '撤销',
      onClick: () => {
        restoreNote(note);
      },
    });
  }

  async function handleClearCompleted() {
    const completed = notes.value.filter(note => note.completed);
    if (completed.length === 0) return;

    const removedIds = new Set(
      await deleteNotes(completed.map(note => note.id))
    );
    const removedNotes = completed.filter(note => removedIds.has(note.id));

    if (removedNotes.length > 0) {
      showToast(`已清除 ${removedNotes.length} 条已完成笔记`, 'info', 5000, {
        text: '撤销',
        onClick: async () => {
          for (const note of removedNotes) {
            await restoreNote(note);
          }
        },
      });
    }
  }

  async function handleToggleStatus(noteId) {
    await toggleNoteStatus(noteId);
  }

  async function handleQuickAdd(text) {
    return await quickAddNote(text);
  }

  onMounted(() => {
    initializeData();
    focusApp();
  });
</script>

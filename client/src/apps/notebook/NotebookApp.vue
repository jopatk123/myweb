<template>
  <div class="notebook-app" @click.self="focusApp" ref="appEl" tabindex="0">
    <NotebookHeader
      :total-count="notes.length"
      :completed-count="completedCount"
      :pending-count="pendingCount"
    />

    <div class="notebook-container">
      <NotebookToolbar
        v-if="!showAddForm && !editingNote"
        v-model:search="searchQuery"
        v-model:filter="filterStatus"
        v-model:compact-view="compactView"
        @add-note="showAddForm = true"
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

        <QuickAddNote
          v-if="!showAddForm && !editingNote"
          :on-quick-add="handleQuickAdd"
        />

        <NotebookForm
          v-if="showAddForm || editingNote"
          :class="{ 'is-expanded': showAddForm || !!editingNote }"
          :note="editingNote"
          @save="handleSaveNote"
          @cancel="handleCancelEdit"
        />

        <NotebookList
          v-if="!showAddForm && !editingNote"
          :notes="filteredNotes"
          :compact-view="compactView"
          @edit="handleEditNote"
          @delete="handleDeleteNote"
          @toggle-status="handleToggleStatus"
        />

        <LoadMoreButton
          v-if="!showAddForm && !editingNote"
          :show="filteredNotes.length > 0 && hasMoreNotes"
          :remaining-count="notes.length - displayLimit"
          :on-load-more="loadMoreNotes"
        />

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
    toggleNoteStatus,
    quickAddNote,
    loadMoreNotes,
    resetDisplayLimit,
    initializeData,
  } = useNotebook();

  const { searchQuery, filterStatus, filteredNotes, hasMoreNotes } =
    useNotebookFilters(notes, displayLimit, resetDisplayLimit);

  const appEl = ref(null);
  const showAddForm = ref(false);
  const editingNote = ref(null);

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

  async function handleDeleteNote(noteId) {
    await deleteNote(noteId);
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

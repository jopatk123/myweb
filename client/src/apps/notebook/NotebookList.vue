<template>
  <div class="notebook-list">
    <div class="list-container">
      <NotebookItem
        v-for="note in notes"
        :key="note.id"
        :note="note"
        :compact-view="compactView"
        @edit="$emit('edit', note)"
        @delete="$emit('delete', note.id)"
        @toggle-status="$emit('toggleStatus', note.id)"
      />
    </div>
  </div>
</template>

<script setup>
  import NotebookItem from './NotebookItem.vue';

  defineProps({
    notes: {
      type: Array,
      default: () => [],
    },
    compactView: {
      type: Boolean,
      default: false,
    },
  });

  defineEmits(['edit', 'delete', 'toggleStatus']);
</script>

<style scoped>
  .notebook-list {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .list-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    overflow-y: auto;
    padding-right: 4px;
    min-height: 0;
  }

  /* 自定义滚动条样式 */
  .list-container::-webkit-scrollbar {
    width: 6px;
  }

  .list-container::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .list-container::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  .list-container::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 768px) {
    .list-container {
      max-height: 300px;
    }
  }
</style>

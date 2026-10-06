<template>
  <div
    class="notebook-item"
    :class="{
      completed: note.completed,
      'high-priority': note.priority === 'high',
      'medium-priority': note.priority === 'medium',
      'compact-view': compactView,
    }"
  >
    <div class="item-content">
      <button
        class="status-btn"
        :class="{ completed: note.completed }"
        :aria-pressed="note.completed"
        :aria-label="note.completed ? '标记为待办' : '标记为已完成'"
        @click="$emit('toggleStatus')"
      >
        <NotebookIcon :name="note.completed ? 'check' : 'circle'" :size="18" />
      </button>

      <div class="note-content">
        <div class="note-header">
          <h4 class="note-title">{{ note.title }}</h4>
          <div class="note-meta">
            <span
              v-if="note.category && !compactView"
              class="note-category"
              :title="`分类：${note.category}`"
            >
              {{ note.category }}
            </span>
            <span class="note-priority" :class="`priority-${note.priority}`">
              {{ getPriorityText(note.priority) }}
            </span>
          </div>
        </div>

        <p v-if="note.description && !compactView" class="note-description">
          {{ note.description }}
        </p>

        <div v-if="!compactView" class="note-footer">
          <span
            class="note-date"
            :title="formatFullDate(note.updatedAt || note.createdAt)"
          >
            {{ formatRelativeDate(note.updatedAt || note.createdAt) }}
          </span>
        </div>
      </div>

      <div class="item-actions">
        <button
          class="action-btn edit-btn"
          aria-label="编辑"
          @click="$emit('edit')"
        >
          <NotebookIcon name="pencil" :size="15" />
        </button>
        <button
          class="action-btn delete-btn"
          aria-label="删除"
          @click="$emit('delete')"
        >
          <NotebookIcon name="trash" :size="15" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import NotebookIcon from './NotebookIcon.vue';
  import { formatRelativeDate, parseServerDate } from '../../utils/datetime.js';

  defineProps({
    note: {
      type: Object,
      required: true,
    },
    compactView: {
      type: Boolean,
      default: false,
    },
  });

  defineEmits(['edit', 'delete', 'toggleStatus']);

  function getPriorityText(priority) {
    const priorityMap = {
      low: '低',
      medium: '中',
      high: '高',
    };
    return priorityMap[priority] || '中';
  }

  function formatFullDate(value) {
    const date = parseServerDate(value);
    return date ? date.toLocaleString('zh-CN') : '';
  }
</script>

<style scoped>
  .notebook-item {
    background: var(--nb-surface, rgba(255, 255, 255, 0.95));
    border-radius: var(--nb-radius, 8px);
    padding: 10px 12px;
    transition: all 0.2s ease;
    border-left: 4px solid var(--nb-accent, #667eea);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    margin-bottom: 8px;
  }

  .notebook-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .notebook-item.completed {
    opacity: 0.7;
    border-left-color: var(--nb-success, #4ade80);
  }

  .notebook-item.high-priority {
    border-left-color: var(--nb-danger, #ef4444);
  }

  .notebook-item.medium-priority {
    border-left-color: var(--nb-warning, #f59e0b);
  }

  .notebook-item.compact-view {
    padding: 6px 10px;
  }

  .item-content {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .status-btn {
    background: none;
    border: none;
    color: var(--nb-text-muted, #a0aec0);
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    transition: all 0.2s ease;
    min-width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .status-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    transform: scale(1.1);
    color: var(--nb-text-secondary, #4a5568);
  }

  .status-btn.completed {
    color: var(--nb-success, #22c55e);
  }

  .note-content {
    flex: 1;
    min-width: 0;
  }

  .note-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    gap: 8px;
  }

  .note-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--nb-text-primary, #2d3748);
    line-height: 1.3;
    word-break: break-word;
  }

  .notebook-item.completed .note-title {
    text-decoration: line-through;
    color: var(--nb-text-muted, #718096);
  }

  .note-meta {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    align-items: center;
  }

  .note-category {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    background: var(--nb-category-bg, #edf2f7);
    color: var(--nb-text-secondary, #4a5568);
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .note-priority {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }

  .priority-low {
    background: #dbeafe;
    color: #1e40af;
  }

  .priority-medium {
    background: #fef3c7;
    color: #d97706;
  }

  .priority-high {
    background: #fecaca;
    color: #dc2626;
  }

  .note-description {
    margin: 0 0 6px 0;
    font-size: 13px;
    color: var(--nb-text-secondary, #4a5568);
    line-height: 1.4;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .notebook-item.completed .note-description {
    color: var(--nb-text-muted, #a0aec0);
  }

  .note-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }

  .note-date {
    font-size: 11px;
    color: var(--nb-text-muted, #a0aec0);
    cursor: default;
  }

  .item-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .action-btn {
    background: none;
    border: none;
    color: var(--nb-text-muted, #a0aec0);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .action-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    transform: scale(1.1);
    color: var(--nb-text-primary, #2d3748);
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: var(--nb-danger, #ef4444);
  }
</style>

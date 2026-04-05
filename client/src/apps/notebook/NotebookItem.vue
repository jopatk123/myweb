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
        @click="$emit('toggleStatus')"
        :title="note.completed ? '标记为待办' : '标记为已完成'"
      >
        <span v-if="note.completed">✅</span>
        <span v-else>⭕</span>
      </button>

      <div class="note-content">
        <div class="note-header">
          <h4 class="note-title">{{ note.title }}</h4>
          <div class="note-meta">
            <span class="note-priority" :class="`priority-${note.priority}`">
              {{ getPriorityText(note.priority) }}
            </span>
          </div>
        </div>

        <p v-if="note.description && !compactView" class="note-description">
          {{ note.description }}
        </p>

        <div v-if="!compactView" class="note-footer">
          <span class="note-date">
            {{ formatDate(note.updatedAt || note.createdAt) }}
          </span>
        </div>
      </div>

      <div class="item-actions">
        <button class="action-btn edit-btn" @click="$emit('edit')" title="编辑">
          ✏️
        </button>
        <button
          class="action-btn delete-btn"
          @click="handleDelete"
          title="删除"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
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

  const emit = defineEmits(['edit', 'delete', 'toggleStatus']);

  function handleDelete() {
    if (confirm('确定要删除这条笔记吗？')) {
      emit('delete');
    }
  }

  function getPriorityText(priority) {
    const priorityMap = {
      low: '低',
      medium: '中',
      high: '高',
    };
    return priorityMap[priority] || '中';
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return '今天';
    } else if (diffDays === 2) {
      return '昨天';
    } else if (diffDays <= 7) {
      return `${diffDays - 1}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      });
    }
  }
</script>

<style scoped>
  .notebook-item {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    padding: 10px 12px;
    transition: all 0.2s ease;
    border-left: 4px solid #667eea;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    margin-bottom: 8px;
  }

  .notebook-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .notebook-item.completed {
    opacity: 0.7;
    border-left-color: #4ade80;
  }

  .notebook-item.high-priority {
    border-left-color: #ef4444;
  }

  .notebook-item.medium-priority {
    border-left-color: #f59e0b;
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
    font-size: 16px;
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
    color: #2d3748;
    line-height: 1.3;
    word-break: break-word;
  }

  .notebook-item.completed .note-title {
    text-decoration: line-through;
    color: #718096;
  }

  .note-meta {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
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
    color: #4a5568;
    line-height: 1.4;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .notebook-item.completed .note-description {
    color: #a0aec0;
  }

  .note-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }

  .note-date {
    font-size: 11px;
    color: #a0aec0;
  }

  .item-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .action-btn {
    background: none;
    border: none;
    font-size: 14px;
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
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.1);
  }
</style>

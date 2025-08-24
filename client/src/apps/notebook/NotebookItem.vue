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
      <!-- 状态切换按钮 -->
      <button
        class="status-btn"
        :class="{ completed: note.completed }"
        @click="$emit('toggleStatus')"
        :title="note.completed ? '标记为待办' : '标记为已完成'"
      >
        <span v-if="note.completed">✅</span>
        <span v-else>⭕</span>
      </button>

      <!-- 笔记内容 -->
      <div class="note-content">
        <div class="note-header">
          <h4 class="note-title">{{ note.title }}</h4>
          <div class="note-meta">
            <span v-if="note.category" class="note-category">{{
              note.category
            }}</span>
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

      <!-- 操作按钮 -->
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
  const props = defineProps({
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
    background: rgba(255, 255, 255, 0.9);
    border-radius: 6px;
    padding: 8px 10px;
    transition: all 0.2s ease;
    border-left: 3px solid #667eea;
    min-height: 60px;
  }

  .notebook-item:hover {
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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
    padding: 4px 6px;
    min-height: 36px;
  }

  .notebook-item.compact-view .item-content {
    gap: 6px;
    min-height: 28px;
  }

  .notebook-item.compact-view .note-title {
    font-size: 13px;
    line-height: 1.1;
  }

  .notebook-item.compact-view .note-meta {
    gap: 4px;
  }

  .notebook-item.compact-view .note-category,
  .notebook-item.compact-view .note-priority {
    padding: 1px 3px;
    font-size: 9px;
  }

  .notebook-item.compact-view .status-btn {
    font-size: 14px;
    min-width: 18px;
    height: 18px;
  }

  .notebook-item.compact-view .action-btn {
    font-size: 11px;
    width: 18px;
    height: 18px;
  }

  .item-content {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-height: 44px;
  }

  .status-btn {
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    transition: all 0.2s ease;
    min-width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .status-btn:hover {
    background: rgba(0, 0, 0, 0.1);
    transform: scale(1.1);
  }

  .note-content {
    flex: 1;
    min-width: 0;
  }

  .note-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
    gap: 6px;
  }

  .note-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    line-height: 1.2;
    word-break: break-word;
  }

  .notebook-item.completed .note-title {
    text-decoration: line-through;
    color: #666;
  }

  .note-meta {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .note-category {
    background: #e5e7eb;
    color: #374151;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 500;
  }

  .note-priority {
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 10px;
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
    margin: 0 0 4px 0;
    font-size: 12px;
    color: #666;
    line-height: 1.3;
    word-break: break-word;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .notebook-item.completed .note-description {
    color: #999;
  }

  .note-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .note-date {
    font-size: 10px;
    color: #888;
  }

  .item-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .action-btn {
    background: none;
    border: none;
    font-size: 12px;
    cursor: pointer;
    padding: 3px;
    border-radius: 3px;
    transition: all 0.2s ease;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .action-btn:hover {
    background: rgba(0, 0, 0, 0.1);
    transform: scale(1.1);
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  @media (max-width: 768px) {
    .notebook-item {
      padding: 10px;
    }

    .note-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .note-meta {
      align-self: stretch;
      justify-content: flex-start;
    }

    .item-actions {
      margin-top: 4px;
    }
  }
</style>

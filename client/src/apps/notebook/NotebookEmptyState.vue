<template>
  <div class="empty-state">
    <div class="empty-content">
      <div class="empty-icon">
        {{ hasNotes ? '🔍' : '📝' }}
      </div>

      <h3 class="empty-title">
        {{ emptyTitle }}
      </h3>

      <p class="empty-message">
        {{ emptyMessage }}
      </p>

      <button
        v-if="!hasNotes"
        class="btn btn-primary"
        @click="$emit('addNote')"
      >
        ➕ 创建第一条笔记
      </button>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    hasNotes: {
      type: Boolean,
      default: false,
    },
    searchQuery: {
      type: String,
      default: '',
    },
  });

  defineEmits(['addNote']);

  const emptyTitle = computed(() => {
    if (!props.hasNotes) {
      return '还没有笔记';
    }
    if (props.searchQuery) {
      return '没有找到匹配的笔记';
    }
    return '没有符合条件的笔记';
  });

  const emptyMessage = computed(() => {
    if (!props.hasNotes) {
      return '开始记录你的想法和待办事项吧！';
    }
    if (props.searchQuery) {
      return `没有找到包含"${props.searchQuery}"的笔记，试试其他关键词？`;
    }
    return '尝试调整筛选条件查看其他笔记';
  });
</script>

<style scoped>
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 40px 20px;
  }

  .empty-content {
    text-align: center;
    max-width: 300px;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 16px;
    opacity: 0.7;
  }

  .empty-title {
    margin: 0 0 12px 0;
    font-size: 1.4rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  .empty-message {
    margin: 0 0 24px 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }

  .btn-primary {
    background: linear-gradient(45deg, #4ade80, #22c55e);
    color: white;
  }

  .btn-primary:hover {
    background: linear-gradient(45deg, #22c55e, #16a34a);
  }

  @media (max-width: 768px) {
    .empty-state {
      min-height: 150px;
      padding: 30px 20px;
    }

    .empty-icon {
      font-size: 3rem;
    }

    .empty-title {
      font-size: 1.2rem;
    }
  }
</style>

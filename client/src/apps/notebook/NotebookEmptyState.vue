<template>
  <div class="empty-state">
    <!-- 简化空状态：移除大图与冗余说明，保留标题和新建按钮以腾出列表空间 -->
    <div class="empty-content compact">
      <h3 class="empty-title">
        {{ emptyTitle }}
      </h3>
      <button
        v-if="!hasNotes"
        class="btn btn-primary"
        @click="$emit('addNote')"
      >
        ➕ 新建笔记
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

</script>

<style scoped>
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    /* 缩小空状态占用高度，给列表留更多空间 */
    min-height: 120px;
    padding: 20px 12px;
  }

  .empty-content {
    text-align: center;
    max-width: 300px;
  }

  .empty-content.compact {
    max-width: 100%;
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
      min-height: 100px;
      padding: 15px 12px;
    }

    .empty-icon {
      font-size: 3rem;
    }

    .empty-title {
      font-size: 1.2rem;
    }
  }
</style>

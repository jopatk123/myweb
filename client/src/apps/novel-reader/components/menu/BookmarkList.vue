<template>
  <div class="bookmarks-wrapper">
    <div v-if="bookmarks && bookmarks.length" class="bookmarks-list">
      <div
        v-for="bookmark in bookmarks"
        :key="bookmark.id"
        class="bookmark-item"
        @click="() => emit('navigate', bookmark)"
      >
        <div class="bookmark-info">
          <div class="bookmark-title">{{ bookmark.title || '未命名书签' }}</div>
          <div class="bookmark-meta">
            {{ chapterTitle(bookmark.chapterIndex) }} ·
            {{ formatDate(bookmark.createdAt) }}
          </div>
        </div>
        <button
          class="delete-bookmark"
          type="button"
          @click.stop="emit('delete', bookmark)"
        >
          🗑️
        </button>
      </div>
    </div>
    <div v-else class="empty-bookmarks">{{ emptyText }}</div>
  </div>
</template>

<script setup>
  const props = defineProps({
    bookmarks: {
      type: Array,
      default: () => [],
    },
    chapters: {
      type: Array,
      default: () => [],
    },
    emptyText: {
      type: String,
      default: '还没有添加任何书签',
    },
  });

  const emit = defineEmits(['navigate', 'delete']);

  function chapterTitle(index) {
    if (!Array.isArray(props.chapters) || index == null) {
      return '未知章节';
    }
    const chapter = props.chapters[index];
    return chapter?.title ?? `章节 ${index + 1}`;
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.warn('格式化书签时间失败:', error);
      return value;
    }
  }
</script>

<style scoped>
  .bookmarks-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .bookmarks-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .bookmark-item {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    cursor: pointer;
    transition: background 0.2s ease;
    border-bottom: 1px solid #f0f0f0;
    gap: 12px;
  }

  .bookmark-item:hover {
    background: #f8f9fa;
  }

  .bookmark-info {
    flex: 1;
    min-width: 0;
  }

  .bookmark-title {
    font-size: 0.9rem;
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bookmark-meta {
    font-size: 0.8rem;
    color: #666;
  }

  .delete-bookmark {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: background 0.2s ease;
    font-size: 0.8rem;
  }

  .delete-bookmark:hover {
    background: #ffebee;
  }

  .empty-bookmarks {
    padding: 40px 20px;
    text-align: center;
    color: #999;
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    .bookmarks-list {
      max-height: 200px;
    }
  }
</style>

<template>
  <div class="book-card" @click="$emit('open', book)">
    <div class="book-cover">
      <div class="book-icon">📚</div>
      <div class="book-format">{{ book.format.toUpperCase() }}</div>
    </div>

    <div class="book-info">
      <h4 class="book-title" :title="book.title">{{ book.title }}</h4>
      <p class="book-author">{{ book.author }}</p>
      <div class="book-meta">
        <span class="book-size">{{ formatFileSize(book.size) }}</span>
        <span class="book-chapters">{{ book.chapters?.length || 0 }} 章</span>
      </div>

      <div v-if="book.lastRead" class="last-read">
        最后阅读: {{ formatDate(book.lastRead) }}
      </div>
    </div>

    <div class="book-actions" @click.stop>
      <button class="action-btn" @click="$emit('info', book)" title="详情">
        ℹ️
      </button>
      <button class="action-btn delete-btn" @click="handleDelete" title="删除">
        🗑️
      </button>
    </div>
  </div>
</template>

<script setup>
  import { filesApi } from '@/api/files.js';
  const emit = defineEmits(['open', 'delete', 'info']);

  async function handleDelete() {
    if (!confirm(`确定要删除《${props.book.title}》吗？`)) return;

    try {
      // 优先使用 book.fileId / book.fileId 字段来定位后端文件 id
      const fileId = props.book.fileId || props.book.file_id;
      if (!fileId) {
        // 若没有后端 id，则直接通知父组件删除本地记录
        emit('delete');
        return;
      }

      // 调用后端删除（后端会在事务中删除 files 与 novels 以及磁盘文件）
      await filesApi.delete(fileId);

      // 删除成功后通知父组件更新本地状态
      emit('delete');
    } catch (err) {
      console.error('删除失败:', err);
      alert(err?.message || '删除失败，请稍后重试');
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '今天';
    if (diffDays === 2) return '昨天';
    if (diffDays <= 7) return `${diffDays - 1}天前`;

    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  }

  const props = defineProps({
    book: {
      type: Object,
      required: true,
    },
  });
</script>

<style scoped>
  .book-card {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .book-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    background: rgba(255, 255, 255, 0.15);
  }

  .book-cover {
    position: relative;
    text-align: center;
    margin-bottom: 12px;
  }

  .book-icon {
    font-size: 3rem;
    margin-bottom: 8px;
    display: block;
  }

  .book-format {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .book-info {
    color: white;
  }

  .book-title {
    margin: 0 0 4px 0;
    font-size: 1rem;
    font-weight: bold;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }

  .book-author {
    margin: 0 0 8px 0;
    font-size: 0.85rem;
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .book-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    opacity: 0.7;
    margin-bottom: 8px;
  }

  .last-read {
    font-size: 0.7rem;
    opacity: 0.6;
    text-align: center;
    padding: 4px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .book-actions {
    position: absolute;
    top: 8px;
    left: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .book-card:hover .book-actions {
    opacity: 1;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    transition: all 0.2s ease;
  }

  .action-btn:hover {
    background: white;
    transform: scale(1.1);
  }

  .delete-btn:hover {
    background: #ff4757;
    color: white;
  }

  @media (max-width: 768px) {
    .book-card {
      padding: 12px;
    }

    .book-icon {
      font-size: 2.5rem;
    }

    .book-title {
      font-size: 0.9rem;
    }

    .book-actions {
      opacity: 1;
    }
  }
</style>

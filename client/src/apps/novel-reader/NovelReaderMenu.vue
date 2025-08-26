<template>
  <div class="reader-menu-overlay" @click="$emit('close')">
    <div class="reader-menu" @click.stop>
      <div class="menu-header">
        <h3>📋 目录</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="menu-content">
        <!-- 章节列表 -->
        <div class="chapters-section">
          <div class="section-title">章节目录</div>
          <div class="chapters-list">
            <div
              v-for="(chapter, index) in book.chapters"
              :key="index"
              class="chapter-item"
              :class="{ active: index === currentChapter }"
              @click="selectChapter(index)"
            >
              <span class="chapter-number">{{ index + 1 }}</span>
              <span class="chapter-title">{{ chapter.title }}</span>
              <span v-if="index === currentChapter" class="current-indicator"
                >📖</span
              >
            </div>
          </div>
        </div>

        <!-- 书签列表 -->
        <div class="bookmarks-section">
          <div class="section-title">
            书签
            <button class="add-bookmark-btn" @click="showAddBookmark = true">
              ➕ 添加书签
            </button>
          </div>

          <div
            v-if="book.bookmarks && book.bookmarks.length > 0"
            class="bookmarks-list"
          >
            <div
              v-for="bookmark in book.bookmarks"
              :key="bookmark.id"
              class="bookmark-item"
              @click="goToBookmark(bookmark)"
            >
              <div class="bookmark-info">
                <div class="bookmark-title">{{ bookmark.title }}</div>
                <div class="bookmark-meta">
                  {{ getChapterTitle(bookmark.chapterIndex) }} ·
                  {{ formatDate(bookmark.createdAt) }}
                </div>
              </div>
              <button
                class="delete-bookmark"
                @click.stop="deleteBookmark(bookmark.id)"
              >
                🗑️
              </button>
            </div>
          </div>

          <div v-else class="empty-bookmarks">还没有添加任何书签</div>
        </div>
      </div>

      <!-- 添加书签对话框 -->
      <div v-if="showAddBookmark" class="add-bookmark-dialog">
        <div class="dialog-content">
          <h4>添加书签</h4>
          <input
            v-model="bookmarkTitle"
            type="text"
            placeholder="书签标题..."
            class="bookmark-input"
            @keyup.enter="addBookmark"
          />
          <div class="dialog-actions">
            <button class="btn btn-secondary" @click="cancelAddBookmark">
              取消
            </button>
            <button
              class="btn btn-primary"
              @click="addBookmark"
              :disabled="!bookmarkTitle.trim()"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue';

  const props = defineProps({
    book: {
      type: Object,
      required: true,
    },
    currentChapter: {
      type: Number,
      default: 0,
    },
  });

  const emit = defineEmits([
    'chapter-select',
    'bookmark-add',
    'bookmark-delete',
    'close',
  ]);

  const showAddBookmark = ref(false);
  const bookmarkTitle = ref('');

  function selectChapter(index) {
    emit('chapter-select', index);
  }

  function goToBookmark(bookmark) {
    emit('chapter-select', bookmark.chapterIndex);
    emit('close');
  }

  function addBookmark() {
    if (!bookmarkTitle.value.trim()) return;

    const bookmark = {
      title: bookmarkTitle.value.trim(),
      chapterIndex: props.currentChapter,
      createdAt: new Date().toISOString(),
    };

    emit('bookmark-add', bookmark);
    cancelAddBookmark();
  }

  function cancelAddBookmark() {
    showAddBookmark.value = false;
    bookmarkTitle.value = '';
  }

  function deleteBookmark(bookmarkId) {
    if (confirm('确定要删除这个书签吗？')) {
      // emit 参数：先传 bookId 再传 bookmarkId，以匹配父组件的处理签名
      emit('bookmark-delete', props.book.id, bookmarkId);

      // 乐观更新本地 UI（父组件或 composable 也会做持久化删除）
      const index = props.book.bookmarks.findIndex(b => b.id === bookmarkId);
      if (index !== -1) {
        props.book.bookmarks.splice(index, 1);
      }
    }
  }

  function getChapterTitle(chapterIndex) {
    if (!props.book.chapters || chapterIndex >= props.book.chapters.length) {
      return '未知章节';
    }
    return props.book.chapters[chapterIndex].title;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
</script>

<style scoped>
  .reader-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .reader-menu {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    position: relative;
  }

  .menu-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
    background: #f8f9fa;
  }

  .menu-header h3 {
    margin: 0;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: #666;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: #e9ecef;
    color: #333;
  }

  .menu-content {
    display: flex;
    max-height: 60vh;
    overflow: hidden;
  }

  .chapters-section {
    flex: 1;
    border-right: 1px solid #eee;
  }

  .bookmarks-section {
    flex: 1;
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #eee;
    font-weight: bold;
    color: #333;
    font-size: 0.9rem;
  }

  .add-bookmark-btn {
    background: #667eea;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .add-bookmark-btn:hover {
    background: #5a6fd8;
  }

  .chapters-list,
  .bookmarks-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .chapter-item {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    cursor: pointer;
    transition: background 0.2s ease;
    border-bottom: 1px solid #f0f0f0;
  }

  .chapter-item:hover {
    background: #f8f9fa;
  }

  .chapter-item.active {
    background: #e3f2fd;
    color: #1976d2;
  }

  .chapter-number {
    font-size: 0.8rem;
    color: #666;
    margin-right: 12px;
    min-width: 30px;
  }

  .chapter-title {
    flex: 1;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .current-indicator {
    margin-left: 8px;
    font-size: 0.8rem;
  }

  .bookmark-item {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    cursor: pointer;
    transition: background 0.2s ease;
    border-bottom: 1px solid #f0f0f0;
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

  .add-bookmark-dialog {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dialog-content {
    background: white;
    padding: 24px;
    border-radius: 8px;
    width: 300px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .dialog-content h4 {
    margin: 0 0 16px 0;
    color: #333;
  }

  .bookmark-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 0.9rem;
    margin-bottom: 16px;
    box-sizing: border-box;
  }

  .bookmark-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn {
    padding: 6px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #5a6268;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #5a6fd8;
  }

  @media (max-width: 768px) {
    .reader-menu {
      width: 95%;
      margin: 20px;
    }

    .menu-content {
      flex-direction: column;
    }

    .chapters-section {
      border-right: none;
      border-bottom: 1px solid #eee;
    }

    .chapters-list,
    .bookmarks-list {
      max-height: 200px;
    }
  }
</style>

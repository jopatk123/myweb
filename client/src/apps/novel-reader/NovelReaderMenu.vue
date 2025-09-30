<template>
  <div class="reader-menu-overlay" @click.self="emit('close')">
    <div class="reader-menu" @click.stop>
      <header class="menu-header">
        <h3>📋 目录</h3>
        <button class="close-btn" type="button" @click="emit('close')">
          ✕
        </button>
      </header>

      <div class="menu-content">
        <MenuSection title="章节目录" class="chapters-section">
          <ChapterList
            :chapters="chapters"
            :current-index="currentChapterIndex"
            @select="emitSelectChapter"
          />
        </MenuSection>

        <MenuSection title="书签" class="bookmarks-section">
          <template #action>
            <button
              class="add-bookmark-btn"
              type="button"
              @click="openAddDialog"
            >
              ➕ 添加书签
            </button>
          </template>

          <BookmarkList
            :bookmarks="bookmarks"
            :chapters="chapters"
            @navigate="navigateToBookmark"
            @delete="deleteBookmark"
          />
        </MenuSection>
      </div>

      <AddBookmarkDialog
        v-model:visible="showAddBookmark"
        v-model:title="bookmarkTitle"
        @confirm="confirmAddBookmark"
        @cancel="cancelAddBookmark"
      />
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';
  import MenuSection from './components/menu/MenuSection.vue';
  import ChapterList from './components/menu/ChapterList.vue';
  import BookmarkList from './components/menu/BookmarkList.vue';
  import AddBookmarkDialog from './components/menu/AddBookmarkDialog.vue';
  import { useReaderMenu } from './composables/useReaderMenu.js';

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
    'force-sync-bookmarks',
    'close',
  ]);

  const {
    showAddBookmark,
    bookmarkTitle,
    chapters,
    bookmarks,
    selectChapter: emitSelectChapter,
    navigateToBookmark,
    openAddDialog,
    cancelAddBookmark,
    confirmAddBookmark,
    deleteBookmark,
  } = useReaderMenu(props, emit);

  const currentChapterIndex = computed(() => props.currentChapter ?? 0);
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
    display: flex;
    flex-direction: column;
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

  .chapters-section,
  .bookmarks-section {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .chapters-section {
    border-right: 1px solid #eee;
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
  }
</style>

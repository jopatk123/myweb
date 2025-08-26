<template>
  <div class="novel-reader-app" @click.self="focusApp" ref="appEl" tabindex="0">
    <!-- 主界面 -->
    <div v-if="!currentBook" class="library-view">
      <NovelLibraryHeader
        :total-books="books.length"
        @upload="showUploadDialog = true"
        @search="handleSearch"
      />

      <NovelLibrary
        :books="filteredBooks"
        :loading="loading"
        @open-book="openBook"
        @delete-book="deleteBook"
        @show-info="showBookInfo"
      />

      <NovelUploadDialog
        v-if="showUploadDialog"
        @upload="handleUpload"
        @close="showUploadDialog = false"
      />
    </div>

    <!-- 阅读界面 -->
    <div v-else class="reader-view">
      <NovelReaderHeader
        :book="currentBook"
        :reading-progress="readingProgress"
        @back="backToLibrary"
        @toggle-menu="showMenu = !showMenu"
        @toggle-settings="showSettings = !showSettings"
      />

      <NovelReaderContent
        :book="currentBook"
        :chapter="currentChapter"
        :settings="readerSettings"
        :progress="readingProgress"
        @progress-change="updateProgress"
        @chapter-change="changeChapter"
      />

      <NovelReaderMenu
        v-if="showMenu"
        :book="currentBook"
        :current-chapter="currentChapterIndex"
        @chapter-select="selectChapter"
        @bookmark-add="addBookmark"
        @close="showMenu = false"
      />

      <NovelReaderSettings
        v-if="showSettings"
        v-model:settings="readerSettings"
        @close="showSettings = false"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue';
  import NovelLibraryHeader from './NovelLibraryHeader.vue';
  import NovelLibrary from './NovelLibrary.vue';
  import NovelUploadDialog from './NovelUploadDialog.vue';
  import NovelReaderHeader from './NovelReaderHeader.vue';
  import NovelReaderContent from './NovelReaderContent.vue';
  import NovelReaderMenu from './NovelReaderMenu.vue';
  import NovelReaderSettings from './NovelReaderSettings.vue';
  import { useNovelReader } from '@/composables/useNovelReader.js';

  // 使用小说阅读器 composable
  const {
    // 状态
    books,
    currentBook,
    currentChapterIndex,
    readingProgress,
    searchQuery,
    loading,
    showUploadDialog,
    showMenu,
    showSettings,
    readerSettings,

    // 计算属性
    filteredBooks,
    currentChapter,

    // 方法
    handleSearch,
    handleUpload,
    openBook,
    backToLibrary,
    changeChapter,
    selectChapter,
    updateProgress,
    addBookmark,
    deleteBook,
    showBookInfo,
    initialize,
  } = useNovelReader();

  // 组件引用
  const appEl = ref(null);

  // 方法
  function focusApp() {
    if (appEl.value && typeof appEl.value.focus === 'function') {
      appEl.value.focus();
    }
  }

  // 组件挂载
  onMounted(async () => {
    await initialize();
    focusApp();
  });
</script>

<style scoped>
  .novel-reader-app {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    min-width: 0;
    min-height: 600px;
    overflow: hidden;
  }

  .library-view,
  .reader-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
</style>

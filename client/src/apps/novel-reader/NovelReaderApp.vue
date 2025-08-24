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
  import { ref, computed, onMounted, watch } from 'vue';
  import NovelLibraryHeader from './NovelLibraryHeader.vue';
  import NovelLibrary from './NovelLibrary.vue';
  import NovelUploadDialog from './NovelUploadDialog.vue';
  import NovelReaderHeader from './NovelReaderHeader.vue';
  import NovelReaderContent from './NovelReaderContent.vue';
  import NovelReaderMenu from './NovelReaderMenu.vue';
  import NovelReaderSettings from './NovelReaderSettings.vue';

  // 响应式数据
  const appEl = ref(null);
  const books = ref([]);
  const currentBook = ref(null);
  const currentChapterIndex = ref(0);
  const readingProgress = ref({});
  const searchQuery = ref('');
  const loading = ref(false);
  const showUploadDialog = ref(false);
  const showMenu = ref(false);
  const showSettings = ref(false);

  // 阅读器设置
  const readerSettings = ref({
    fontSize: 16,
    lineHeight: 1.6,
    fontFamily: 'serif',
    theme: 'light',
    pageWidth: 800,
    autoSave: true,
  });

  // 计算属性
  const filteredBooks = computed(() => {
    if (!searchQuery.value.trim()) return books.value;

    const query = searchQuery.value.toLowerCase();
    return books.value.filter(
      book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
    );
  });

  const currentChapter = computed(() => {
    if (!currentBook.value || !currentBook.value.chapters) return null;
    return currentBook.value.chapters[currentChapterIndex.value] || null;
  });

  // 方法
  function focusApp() {
    if (appEl.value && typeof appEl.value.focus === 'function') {
      appEl.value.focus();
    }
  }

  function handleSearch(query) {
    searchQuery.value = query;
  }

  async function handleUpload(files) {
    loading.value = true;
    try {
      for (const file of files) {
        const book = await parseBookFile(file);
        if (book) {
          books.value.push(book);
        }
      }
      saveBooks();
    } catch (error) {
      console.error('上传文件失败:', error);
    } finally {
      loading.value = false;
      showUploadDialog.value = false;
    }
  }

  async function parseBookFile(file) {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const content = e.target.result;
          const book = {
            id: generateId(),
            title: file.name.replace(/\.[^/.]+$/, ''),
            author: '未知作者',
            size: file.size,
            format: file.name.split('.').pop().toLowerCase(),
            content: content,
            chapters: parseChapters(content),
            addedAt: new Date().toISOString(),
            lastRead: null,
          };
          resolve(book);
        } catch (error) {
          console.error('解析文件失败:', error);
          resolve(null);
        }
      };
      reader.readAsText(file, 'UTF-8');
    });
  }

  function parseChapters(content) {
    // 简单的章节分割逻辑，可以根据需要优化
    const chapterRegex = /第[一二三四五六七八九十\d]+[章节]/g;
    const chapters = [];
    const matches = [...content.matchAll(chapterRegex)];

    if (matches.length === 0) {
      // 如果没有找到章节标记，整本书作为一章
      return [
        {
          title: '正文',
          content: content,
          startIndex: 0,
        },
      ];
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const nextMatch = matches[i + 1];
      const startIndex = match.index;
      const endIndex = nextMatch ? nextMatch.index : content.length;

      chapters.push({
        title: match[0],
        content: content.slice(startIndex, endIndex).trim(),
        startIndex: startIndex,
      });
    }

    return chapters;
  }

  function openBook(book) {
    currentBook.value = book;
    currentChapterIndex.value = 0;

    // 恢复阅读进度
    const progress = readingProgress.value[book.id];
    if (progress) {
      currentChapterIndex.value = progress.chapterIndex || 0;
    }

    // 更新最后阅读时间
    book.lastRead = new Date().toISOString();
    saveBooks();
  }

  function backToLibrary() {
    currentBook.value = null;
    showMenu.value = false;
    showSettings.value = false;
  }

  function changeChapter(direction) {
    if (!currentBook.value) return;

    const newIndex = currentChapterIndex.value + direction;
    if (newIndex >= 0 && newIndex < currentBook.value.chapters.length) {
      currentChapterIndex.value = newIndex;
      updateProgress({ chapterIndex: newIndex, scrollPosition: 0 });
    }
  }

  function selectChapter(index) {
    currentChapterIndex.value = index;
    updateProgress({ chapterIndex: index, scrollPosition: 0 });
    showMenu.value = false;
  }

  function updateProgress(progress) {
    if (!currentBook.value) return;

    readingProgress.value[currentBook.value.id] = {
      ...readingProgress.value[currentBook.value.id],
      ...progress,
      lastRead: new Date().toISOString(),
    };

    if (readerSettings.value.autoSave) {
      saveProgress();
    }
  }

  function addBookmark(bookmark) {
    if (!currentBook.value) return;

    if (!currentBook.value.bookmarks) {
      currentBook.value.bookmarks = [];
    }

    currentBook.value.bookmarks.push({
      id: generateId(),
      ...bookmark,
      createdAt: new Date().toISOString(),
    });

    saveBooks();
  }

  function deleteBook(bookId) {
    const index = books.value.findIndex(book => book.id === bookId);
    if (index !== -1) {
      books.value.splice(index, 1);
      delete readingProgress.value[bookId];
      saveBooks();
      saveProgress();
    }
  }

  function showBookInfo(book) {
    // 显示书籍详情的逻辑
    console.log('显示书籍信息:', book);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  function saveBooks() {
    try {
      localStorage.setItem('novel-reader-books', JSON.stringify(books.value));
    } catch (error) {
      console.error('保存书籍失败:', error);
    }
  }

  function loadBooks() {
    try {
      const saved = localStorage.getItem('novel-reader-books');
      if (saved) {
        books.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error('加载书籍失败:', error);
      books.value = [];
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(
        'novel-reader-progress',
        JSON.stringify(readingProgress.value)
      );
    } catch (error) {
      console.error('保存进度失败:', error);
    }
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem('novel-reader-progress');
      if (saved) {
        readingProgress.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error('加载进度失败:', error);
      readingProgress.value = {};
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        'novel-reader-settings',
        JSON.stringify(readerSettings.value)
      );
    } catch (error) {
      console.error('保存设置失败:', error);
    }
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('novel-reader-settings');
      if (saved) {
        readerSettings.value = {
          ...readerSettings.value,
          ...JSON.parse(saved),
        };
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }

  // 监听设置变化
  watch(readerSettings, saveSettings, { deep: true });

  // 组件挂载
  onMounted(() => {
    loadBooks();
    loadProgress();
    loadSettings();
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

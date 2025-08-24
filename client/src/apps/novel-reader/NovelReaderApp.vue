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
  import { filesApi } from '@/api/files.js';

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
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB: 客户端上传限制（后端支持更大）
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
      // 上传到后端（小说专用端点）
      const resp = await filesApi.uploadNovels(files, p => {});
      // 后端现在返回 { code, success, data, novels? }
      const created = resp && resp.data ? resp.data : null;
      // 支持两种后端返回：单个 file 对象或数组；并兼容后端新增的 novels 字段
      let uploadedFiles = [];
      let uploadedNovels = [];
      if (created) {
        if (Array.isArray(created)) {
          uploadedFiles = created;
        } else if (created.file) {
          // 当后端把 file 放在 data.file 时
          uploadedFiles = [created.file];
        } else if (created.id || created.originalName) {
          uploadedFiles = [created];
        }
      }
      if (resp && resp.novels) {
        uploadedNovels = Array.isArray(resp.novels)
          ? resp.novels
          : [resp.novels];
      }

      const uploaded = uploadedFiles;

      for (const f of uploaded) {
        try {
          const id = f.id || f.ID || f.id;
          const downloadUrl = filesApi.downloadUrl(id);
          // 先尝试基于 content-type 获取文本内容，仅支持 text/* 类型
          const r = await fetch(downloadUrl);
          const ct = r.headers.get('content-type') || '';
          if (ct.startsWith('text/') || ct.includes('json')) {
            const content = await r.text();
            const book = {
              id: generateId(),
              title: f.original_name || f.originalName || '未命名',
              author: '未知作者',
              size: f.file_size || f.fileSize || 0,
              format: (f.original_name || f.originalName || '')
                .split('.')
                .pop()
                .toLowerCase(),
              content,
              chapters: parseChapters(content),
              addedAt: new Date().toISOString(),
              lastRead: null,
              fileId: id,
              fileUrl: f.file_url || downloadUrl,
            };
            books.value.push(book);
          } else {
            // 非文本文件，保存元数据并保留后端引用，客户端在打开时可下载或流式处理
            const bookMeta = {
              id: generateId(),
              title: f.original_name || f.originalName || '未命名',
              author: '未知作者',
              size: f.file_size || f.fileSize || 0,
              format: (f.original_name || f.originalName || '')
                .split('.')
                .pop()
                .toLowerCase(),
              content: null,
              chapters: [],
              addedAt: new Date().toISOString(),
              lastRead: null,
              fileId: id,
              fileUrl: f.file_url || downloadUrl,
            };
            books.value.push(bookMeta);
          }
        } catch (err) {
          console.error('处理已上传文件失败:', err);
        }
      }

      // 保存元数据（或内容，视保存逻辑回退而定）
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
    // 简单的章节分割逻辑：支持中文数字（零 一 二 两 三 四 五 六 七 八 九 十 百 千 万 亿）和阿拉伯数字
    // 以及常见的章节后缀（章/节/回/卷/篇/部）。这可以避免仅匹配到 99 章的问题。
    const chapterRegex =
      /第[\d零一二两三四五六七八九十百千万亿]+[章节回卷部篇节]/g;
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

  async function openBook(book) {
    currentBook.value = book;
    currentChapterIndex.value = 0;

    // 恢复阅读进度
    const progress = readingProgress.value[book.id];
    if (progress) {
      currentChapterIndex.value = progress.chapterIndex || 0;
    }

    // 若本地没有内容但存在后端引用，按需从后端加载内容（避免一次性拉取所有大文件）
    if (
      (!book.content || book.content === null) &&
      (book.fileUrl || book.file_url)
    ) {
      const url = book.fileUrl || book.file_url;
      try {
        const r = await fetch(url);
        const ct = r.headers.get('content-type') || '';
        if (ct.startsWith('text/') || ct.includes('json')) {
          const content = await r.text();
          book.content = content;
          book.chapters = parseChapters(content);
        } else {
          // 非文本暂不自动下载内容
          console.info('文件不是文本类型，按需下载。');
        }
      } catch (err) {
        console.error('从后端获取书籍内容失败:', err);
      }
    }

    // 更新最后阅读时间并保存元数据/内容（如果已加载）
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

  async function deleteBook(bookId) {
    const index = books.value.findIndex(book => book.id === bookId);
    if (index === -1) return;

    const book = books.value[index];
    // 如果有后端 fileId，先调用后端删除以保证一致性（后端会在事务中删除 files/novels/磁盘文件）
    const fileId = book.fileId || book.file_id;
    if (fileId) {
      // 乐观界面：禁用交互以避免重复操作
      try {
        // 调用后端删除
        await filesApi.delete(fileId);
      } catch (err) {
        // 若后端提示文件不存在(已被删除)，视为已删除并继续，不作为错误日志打印
        if (err && (err.code === 404 || err.status === 404)) {
          console.warn('后端记录已不存在，继续从本地移除');
        } else {
          console.error('后端删除失败:', err);
          alert(err?.message || '删除失败，请重试');
          return;
        }
      }
    }

    // 更新本地状态
    books.value.splice(index, 1);
    delete readingProgress.value[bookId];
    saveBooks();
    saveProgress();
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
      // 优先尝试保存完整内容（可能会超配额）
      try {
        localStorage.setItem('novel-reader-books', JSON.stringify(books.value));
        return;
      } catch (err) {
        // 回退：保存仅含元数据的版本（移除 content 与 chapters 字段）
        console.warn(
          '保存完整书籍到 localStorage 失败，尝试只保存元数据：',
          err
        );
        const metaOnly = books.value.map(b => {
          const { content, chapters, ...meta } = b;
          return meta;
        });
        try {
          localStorage.setItem('novel-reader-books', JSON.stringify(metaOnly));
          console.info('已保存书籍元数据到 localStorage，书籍内容未被缓存。');
          return;
        } catch (err2) {
          console.error('保存书籍元数据也失败:', err2);
          throw err2;
        }
      }
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

  // 从后端同步小说列表（按需合并到本地）
  async function syncServerNovels() {
    try {
      loading.value = true;
      const resp = await filesApi.list({ type: 'novel', page: 1, limit: 1000 });
      const serverFiles =
        resp && resp.data && Array.isArray(resp.data.files)
          ? resp.data.files
          : [];

      const existingIds = new Set(
        books.value.map(b => b.fileId || b.file_id).filter(Boolean)
      );

      for (const f of serverFiles) {
        const id = f.id || f.ID;
        if (!id || existingIds.has(id)) continue;
        const downloadUrl = filesApi.downloadUrl(id);
        const titleRaw = f.original_name || f.originalName || '未命名';
        const title = titleRaw.replace(/\.[^/.]+$/, '');
        const format = titleRaw.split('.').pop()?.toLowerCase?.() || '';

        const bookMeta = {
          id: generateId(),
          title,
          author: '未知作者',
          size: f.file_size || f.fileSize || 0,
          format,
          content: null,
          chapters: [],
          addedAt: new Date().toISOString(),
          lastRead: null,
          fileId: id,
          fileUrl: f.file_url || downloadUrl,
        };
        books.value.push(bookMeta);
      }

      saveBooks();
    } catch (err) {
      console.error('同步后端小说列表失败:', err);
    } finally {
      loading.value = false;
    }
  }

  // 监听设置变化
  watch(readerSettings, saveSettings, { deep: true });

  // 组件挂载
  onMounted(() => {
    loadBooks();
    loadProgress();
    loadSettings();
    // 从后端加载小说（适配多浏览器/多设备同步）
    syncServerNovels();
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

import { ref, computed, watch } from 'vue';
import { useNovelStorage } from './useNovelStorage.js';
import { useNovelParser } from './useNovelParser.js';
import { useNovelSync } from './useNovelSync.js';
import { filesApi } from '@/api/files.js';

export function useNovelReader() {
  // 响应式数据
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

  // 使用其他 composables
  const {
    saveBooks,
    loadBooks,
    saveProgress,
    loadProgress,
    saveSettings,
    loadSettings,
  } = useNovelStorage();
  const { parseChapters, parseBookFile, generateId } = useNovelParser();
  const { syncServerNovels } = useNovelSync();

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
      saveBooks(books.value);
    } catch (error) {
      console.error('上传文件失败:', error);
    } finally {
      loading.value = false;
      showUploadDialog.value = false;
    }
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
    saveBooks(books.value);
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
      saveProgress(readingProgress.value);
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

    saveBooks(books.value);
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
    saveBooks(books.value);
    saveProgress(readingProgress.value);
  }

  function showBookInfo(book) {
    // 显示书籍详情的逻辑
    console.log('显示书籍信息:', book);
  }

  // 初始化函数
  async function initialize() {
    loadBooks(books);
    loadProgress(readingProgress);
    loadSettings(readerSettings);
    // 从后端加载小说（适配多浏览器/多设备同步）
    await syncServerNovels(books, readingProgress, saveBooks);
  }

  // 监听设置变化
  watch(readerSettings, () => saveSettings(readerSettings.value), {
    deep: true,
  });

  return {
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
  };
}

import { ref, computed } from 'vue';
import { bookmarksApi } from '@/api/bookmarks.js';

export function useNovelBookmarks() {
  const bookmarks = ref({}); // 按书籍ID分组存储书签
  const loading = ref(false);
  const deviceId = ref(localStorage.getItem('device-id') || generateDeviceId());

  // 生成设备ID
  function generateDeviceId() {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem('device-id', id);
    return id;
  }

  // 获取指定书籍的书签
  function getBookmarksByBookId(bookId) {
    return bookmarks.value[bookId] || [];
  }

  // 强制同步指定书籍的书签（以服务器为准）
  async function forceSyncBookmarks(bookId, fileId = null) {
    if (!fileId) {
      console.warn('[bookmarks] forceSyncBookmarks: fileId is required');
      return;
    }

    try {
      loading.value = true;
      
      const response = await bookmarksApi.getByFileId(fileId);
      
      if (response && response.success && Array.isArray(response.data)) {
        const serverBookmarks = response.data;
        const bookmarksToAdd = serverBookmarks.map(serverBookmark => ({
          id: serverBookmark.id,
          title: serverBookmark.title,
          chapterIndex: serverBookmark.chapterIndex,
          scrollPosition: serverBookmark.scrollPosition,
          note: serverBookmark.note,
          createdAt: serverBookmark.createdAt,
          updatedAt: serverBookmark.updatedAt,
          serverId: serverBookmark.id,
          fileId: serverBookmark.fileId,
        }));
        
        bookmarks.value[bookId] = bookmarksToAdd;
        saveBookmarksToLocal();
      } else {
        bookmarks.value[bookId] = [];
        saveBookmarksToLocal();
      }
    } catch (error) {
      console.error('强制同步书签失败:', error);
      bookmarks.value[bookId] = [];
      saveBookmarksToLocal();
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 添加书签（强一致：先服务端成功再缓存）
  async function addBookmark(bookId, bookmarkData) {
    if (!bookmarkData.fileId) {
      throw new Error('fileId is required');
    }

    try {
      loading.value = true;

      const response = await bookmarksApi.create({
        bookId: bookmarkData.fileId, // 使用 fileId 作为 bookId
        fileId: bookmarkData.fileId,
        title: bookmarkData.title,
        chapterIndex: bookmarkData.chapterIndex,
        scrollPosition: bookmarkData.scrollPosition,
        note: bookmarkData.note,
        deviceId: deviceId.value,
      });

      if (response && response.success && response.data) {
        const server = response.data;
        if (!bookmarks.value[bookId]) bookmarks.value[bookId] = [];
        bookmarks.value[bookId].push({
          id: server.id,
          title: server.title,
          chapterIndex: server.chapterIndex,
          scrollPosition: server.scrollPosition,
          note: server.note,
          createdAt: server.createdAt,
          updatedAt: server.updatedAt,
          serverId: server.id,
          fileId: bookmarkData.fileId,
        });
        saveBookmarksToLocal();
        return server;
      }
      throw new Error('创建书签失败');
    } catch (error) {
      console.error('添加书签失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 删除书签（强一致：先服务端，再更新本地；幂等）
  async function deleteBookmark(bookId, bookmarkId) {
    try {
      loading.value = true;
      
      const list = bookmarks.value[bookId] || [];
      const target = list.find(b => b.id === bookmarkId);
      const serverId = target?.serverId || target?.id;
      
      if (serverId) {
        try {
          await bookmarksApi.delete(serverId);
        } catch (e) {
          if (e && (e.status === 404 || e.code === 404)) {
            // 已删除，继续
          } else {
            throw e;
          }
        }
      }
      
      bookmarks.value[bookId] = list.filter(b => b.id !== bookmarkId);
      saveBookmarksToLocal();
    } catch (error) {
      console.error('删除书签失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 更新书签（强一致：先服务端，再更新缓存）
  async function updateBookmark(bookId, bookmarkId, updates) {
    try {
      loading.value = true;
      const list = bookmarks.value[bookId] || [];
      const target = list.find(b => b.id === bookmarkId);
      if (!target) return;
      
      const serverId = target.serverId || target.id;
      if (serverId) {
        try {
          await bookmarksApi.update(serverId, updates);
        } catch (e) {
          throw e;
        }
      }
      
      Object.assign(target, updates);
      target.updatedAt = new Date().toISOString();
      saveBookmarksToLocal();
    } catch (error) {
      console.error('更新书签失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 加载书籍的书签（强一致：以服务器为准，失败才用本地兜底）
  async function loadBookmarks(bookId, fileId = null) {
    try {
      loading.value = true;
      try {
        let response = await bookmarksApi.getByBookId(bookId);
        if (!(response && response.success && Array.isArray(response.data)) && fileId) {
          response = await bookmarksApi.getByFileId(fileId);
        }
        if (response && response.success && Array.isArray(response.data)) {
          bookmarks.value[bookId] = response.data.map(serverBookmark => ({
            id: serverBookmark.id,
            title: serverBookmark.title,
            chapterIndex: serverBookmark.chapterIndex,
            scrollPosition: serverBookmark.scrollPosition,
            note: serverBookmark.note,
            createdAt: serverBookmark.createdAt,
            updatedAt: serverBookmark.updatedAt,
            serverId: serverBookmark.id,
            fileId: serverBookmark.fileId,
          }));
          saveBookmarksToLocal();
        }
      } catch (error) {
        console.warn('从服务器加载书签失败，使用本地兜底:', error);
      }
    } catch (error) {
      console.error('加载书签失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 同步所有书签（强一致：拉取服务器全量覆盖本地）
  async function syncAllBookmarks() {
    try {
      loading.value = true;
      
      const response = await bookmarksApi.getAll();
      if (response && response.success && Array.isArray(response.data)) {
        const serverBookmarks = response.data;
        const resolveLocalBookIdByFileId = fileId => {
          if (fileId === undefined || fileId === null) return null;
          const norm = v => {
            const s = String(v);
            if (/^\d+\.0+$/.test(s)) return String(parseInt(s, 10));
            return s;
          };
          try {
            const saved = localStorage.getItem('novel-reader-books');
            if (!saved) return null;
            const booksArr = JSON.parse(saved);
            const target = norm(fileId);
            const found = Array.isArray(booksArr)
              ? booksArr.find(b => {
                  const fid = b && (b.fileId ?? b.file_id);
                  if (fid === undefined || fid === null) return false;
                  return norm(fid) === target;
                })
              : null;
            return found ? found.id : null;
          } catch (_) {
            return null;
          }
        };

        const grouped = {};
        serverBookmarks.forEach(sb => {
          let gid = sb.bookId;
          if (!gid) {
            const mapped = resolveLocalBookIdByFileId(sb.fileId);
            gid = mapped || sb.bookId || 'unknown';
          }
          if (!grouped[gid]) grouped[gid] = [];
          grouped[gid].push({
            id: sb.id,
            title: sb.title,
            chapterIndex: sb.chapterIndex,
            scrollPosition: sb.scrollPosition,
            note: sb.note,
            createdAt: sb.createdAt,
            updatedAt: sb.updatedAt,
            serverId: sb.id,
            fileId: sb.fileId,
          });
        });
        
        bookmarks.value = grouped;
        saveBookmarksToLocal();
      }
    } catch (error) {
      console.error('同步书签失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 保存书签到本地存储
  function saveBookmarksToLocal() {
    try {
      localStorage.setItem('novel-bookmarks', JSON.stringify(bookmarks.value));
    } catch (error) {
      console.error('保存书签到本地存储失败:', error);
    }
  }

  // 从本地存储加载书签
  function loadBookmarksFromLocal() {
    try {
      const saved = localStorage.getItem('novel-bookmarks');
      if (saved) {
        bookmarks.value = JSON.parse(saved);
      }
    } catch (error) {
      console.error('从本地存储加载书签失败:', error);
      bookmarks.value = {};
    }
  }

  // 删除书籍的所有书签
  async function deleteBookmarksByBookId(bookId) {
    try {
      loading.value = true;

      try {
        await bookmarksApi.deleteByBookId(bookId);
      } catch (error) {
        console.warn('从服务器删除书籍书签失败:', error);
        throw error;
      }

      delete bookmarks.value[bookId];
      saveBookmarksToLocal();
    } catch (error) {
      console.error('删除书籍书签失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 生成ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 计算属性：所有书签数量
  const totalBookmarks = computed(() => {
    return Object.values(bookmarks.value).reduce((total, bookmarksList) => {
      return total + bookmarksList.length;
    }, 0);
  });

  return {
    // 状态
    bookmarks,
    loading,
    deviceId,

    // 计算属性
    totalBookmarks,

    // 方法
    getBookmarksByBookId,
    addBookmark,
    deleteBookmark,
    updateBookmark,
    loadBookmarks,
    forceSyncBookmarks,
    syncAllBookmarks,
    deleteBookmarksByBookId,
    saveBookmarksToLocal,
    loadBookmarksFromLocal,
  };
}

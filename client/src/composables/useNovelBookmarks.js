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

  // 添加书签
  async function addBookmark(bookId, bookmarkData) {
    try {
      loading.value = true;

      console.log('[bookmarks] addBookmark start', {
        bookId,
        bookmarkData,
        deviceId: deviceId.value,
      });

      // 本地添加
      if (!bookmarks.value[bookId]) {
        bookmarks.value[bookId] = [];
      }

      const newBookmark = {
        id: bookmarkData.id || generateId(),
        ...bookmarkData,
        createdAt: new Date().toISOString(),
      };

      bookmarks.value[bookId].push(newBookmark);

      // 保存到本地存储
      saveBookmarksToLocal();
      console.log('[bookmarks] added local temp bookmark', {
        bookId,
        tempId: newBookmark.id,
        bookmarks: bookmarks.value[bookId],
      });

      // 同步到服务器
      try {
        const response = await bookmarksApi.create({
          bookId,
          fileId: bookmarkData.fileId,
          title: bookmarkData.title,
          chapterIndex: bookmarkData.chapterIndex,
          scrollPosition: bookmarkData.scrollPosition,
          note: bookmarkData.note,
          deviceId: deviceId.value,
        });

        if (response.success && response.data) {
          console.log('[bookmarks] server create response', response.data);
          const serverId = response.data.id;

          // 找到本地临时书签（使用临时 id），并替换为服务器 id，保持其他字段
          const localList = bookmarks.value[bookId] || [];
          const tempIndex = localList.findIndex(b => b.id === newBookmark.id);
          if (tempIndex !== -1) {
            const bookmarkObj = localList[tempIndex];
            // 更新 id 为服务器 id，同时记录 serverId
            bookmarkObj.id = serverId;
            bookmarkObj.serverId = serverId;
            // 更新时间戳，如果服务器返回则使用服务器的时间
            if (response.data.updatedAt) {
              bookmarkObj.updatedAt = response.data.updatedAt;
            }
            console.log('[bookmarks] replaced temp id with server id', {
              bookId,
              tempId: newBookmark.id,
              serverId,
            });
          } else {
            // 如果找不到临时项（极少见），直接加入服务器返回的书签
            bookmarks.value[bookId] = bookmarks.value[bookId] || [];
            bookmarks.value[bookId].push({
              id: serverId,
              title: response.data.title,
              chapterIndex: response.data.chapterIndex,
              scrollPosition: response.data.scrollPosition,
              note: response.data.note,
              createdAt: response.data.createdAt,
              updatedAt: response.data.updatedAt,
              serverId: serverId,
            });
          }

          saveBookmarksToLocal();
          console.log('[bookmarks] after create merged local list', {
            bookId,
            bookmarks: bookmarks.value[bookId],
          });
        }
      } catch (error) {
        console.warn('书签同步到服务器失败，将在下次同步时重试:', error);
      }

      return newBookmark;
    } catch (error) {
      console.error('添加书签失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 删除书签
  async function deleteBookmark(bookId, bookmarkId) {
    try {
      loading.value = true;

      console.log('[bookmarks] deleteBookmark start', { bookId, bookmarkId });

      // 本地删除
      const bookmarksList = bookmarks.value[bookId];
      if (bookmarksList) {
        const bookmarkIndex = bookmarksList.findIndex(b => b.id === bookmarkId);
        if (bookmarkIndex !== -1) {
          const bookmark = bookmarksList[bookmarkIndex];
          bookmarksList.splice(bookmarkIndex, 1);

          // 保存到本地存储
          saveBookmarksToLocal();
          console.log('[bookmarks] removed local bookmark', {
            bookId,
            bookmarkId,
            remaining: bookmarks.value[bookId],
          });

          // 从服务器删除
          if (bookmark.serverId) {
            try {
              const resp = await bookmarksApi.delete(bookmark.serverId);
              console.log('[bookmarks] server delete response', {
                serverId: bookmark.serverId,
                resp,
              });
            } catch (error) {
              console.warn('从服务器删除书签失败:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('删除书签失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 更新书签
  async function updateBookmark(bookId, bookmarkId, updates) {
    try {
      loading.value = true;

      // 本地更新
      const bookmarksList = bookmarks.value[bookId];
      if (bookmarksList) {
        const bookmark = bookmarksList.find(b => b.id === bookmarkId);
        if (bookmark) {
          Object.assign(bookmark, updates);
          bookmark.updatedAt = new Date().toISOString();

          // 保存到本地存储
          saveBookmarksToLocal();

          // 同步到服务器
          if (bookmark.serverId) {
            try {
              await bookmarksApi.update(bookmark.serverId, updates);
            } catch (error) {
              console.warn('更新书签到服务器失败:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('更新书签失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 加载书籍的书签
  async function loadBookmarks(bookId, fileId = null) {
    try {
      loading.value = true;

      // 先从本地加载
      loadBookmarksFromLocal();
      console.log('[bookmarks] loadBookmarks from local', {
        bookId,
        local: bookmarks.value[bookId],
      });

      // 从服务器加载：优先按 bookId 查询，若无结果再按 fileId 查询
      try {
        let response = await bookmarksApi.getByBookId(bookId);
        // 如果按 bookId 没有返回结果且存在 fileId，则尝试按 fileId 查询
        if (
          !(
            response &&
            response.success &&
            response.data &&
            response.data.length > 0
          ) &&
          fileId
        ) {
          console.log(
            '[bookmarks] no server results by bookId, trying fileId',
            { bookId, fileId }
          );
          response = await bookmarksApi.getByFileId(fileId);
        }

        if (response && response.success && response.data) {
          console.log('[bookmarks] loadBookmarks server response', {
            bookId,
            fileId,
            data: response.data,
          });

          // 合并服务器数据到本地
          const serverBookmarks = response.data;
          const localBookmarks = bookmarks.value[bookId] || [];

          // 创建本地书签映射
          const localMap = new Map(localBookmarks.map(b => [b.id, b]));

          // 处理服务器书签
          serverBookmarks.forEach(serverBookmark => {
            const localBookmark = localMap.get(serverBookmark.id);
            if (!localBookmark) {
              // 服务器有但本地没有，添加到本地
              bookmarks.value[bookId] = bookmarks.value[bookId] || [];
              bookmarks.value[bookId].push({
                id: serverBookmark.id,
                title: serverBookmark.title,
                chapterIndex: serverBookmark.chapterIndex,
                scrollPosition: serverBookmark.scrollPosition,
                note: serverBookmark.note,
                createdAt: serverBookmark.createdAt,
                updatedAt: serverBookmark.updatedAt,
                serverId: serverBookmark.id,
              });
            } else if (serverBookmark.updatedAt > localBookmark.updatedAt) {
              // 服务器版本更新，更新本地
              Object.assign(localBookmark, {
                title: serverBookmark.title,
                chapterIndex: serverBookmark.chapterIndex,
                scrollPosition: serverBookmark.scrollPosition,
                note: serverBookmark.note,
                updatedAt: serverBookmark.updatedAt,
              });
            }
          });

          saveBookmarksToLocal();
          console.log('[bookmarks] loadBookmarks merged local', {
            bookId,
            result: bookmarks.value[bookId],
          });
        }
      } catch (error) {
        console.warn('从服务器加载书签失败，使用本地数据:', error);
      }
    } catch (error) {
      console.error('加载书签失败:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  }

  // 同步所有书签
  async function syncAllBookmarks() {
    try {
      loading.value = true;

      console.log('[bookmarks] syncAllBookmarks start', {
        deviceId: deviceId.value,
      });

      // 收集所有本地书签
      const allLocalBookmarks = [];
      Object.entries(bookmarks.value).forEach(([bookId, bookmarksList]) => {
        bookmarksList.forEach(bookmark => {
          allLocalBookmarks.push({
            id: bookmark.id,
            bookId,
            fileId: bookmark.fileId,
            title: bookmark.title,
            chapterIndex: bookmark.chapterIndex,
            scrollPosition: bookmark.scrollPosition,
            note: bookmark.note,
            createdAt: bookmark.createdAt,
            updatedAt: bookmark.updatedAt,
          });
        });
      });

      // 同步到服务器
      console.log('[bookmarks] syncAllBookmarks payload', {
        allLocalBookmarks,
      });

      const response = await bookmarksApi.sync(
        deviceId.value,
        allLocalBookmarks
      );

      console.log('[bookmarks] syncAllBookmarks server response', response);

      if (response.success && response.data) {
        const {
          toDownload = [],
          uploaded = [],
          serverBookmarks = [],
        } = response.data;

        // 先将服务器要下发的书签合并到本地
        toDownload.forEach(serverBookmark => {
          const bookId = serverBookmark.bookId;
          if (!bookmarks.value[bookId]) {
            bookmarks.value[bookId] = [];
          }

          const exists = bookmarks.value[bookId].some(
            b => b.id === serverBookmark.id
          );
          if (!exists) {
            bookmarks.value[bookId].push({
              id: serverBookmark.id,
              title: serverBookmark.title,
              chapterIndex: serverBookmark.chapterIndex,
              scrollPosition: serverBookmark.scrollPosition,
              note: serverBookmark.note,
              createdAt: serverBookmark.createdAt,
              updatedAt: serverBookmark.updatedAt,
              serverId: serverBookmark.id,
            });
          }
        });

        // 处理服务器新创建（uploaded）项：尝试匹配本地临时项并替换 id
        uploaded.forEach(up => {
          const bookId = up.bookId;
          if (!bookmarks.value[bookId]) bookmarks.value[bookId] = [];
          const localList = bookmarks.value[bookId];

          const matchIndex = localList.findIndex(
            b =>
              (b.serverId && b.serverId === up.id) ||
              (b.title === up.title &&
                b.chapterIndex === up.chapterIndex &&
                b.scrollPosition === up.scrollPosition)
          );

          if (matchIndex !== -1) {
            const local = localList[matchIndex];
            local.id = up.id;
            local.serverId = up.id;
            local.createdAt = up.createdAt;
            local.updatedAt = up.updatedAt;
            console.log('[bookmarks] sync matched uploaded -> local', {
              bookId,
              upId: up.id,
              local,
            });
          } else {
            localList.push({
              id: up.id,
              title: up.title,
              chapterIndex: up.chapterIndex,
              scrollPosition: up.scrollPosition,
              note: up.note,
              createdAt: up.createdAt,
              updatedAt: up.updatedAt,
              serverId: up.id,
            });
          }
        });

        // 将服务器端的全量书签作为可信源进行合并/更新
        serverBookmarks.forEach(sb => {
          const bookId = sb.bookId;
          if (!bookmarks.value[bookId]) bookmarks.value[bookId] = [];
          const exists = bookmarks.value[bookId].some(b => b.id === sb.id);
          if (!exists) {
            bookmarks.value[bookId].push({
              id: sb.id,
              title: sb.title,
              chapterIndex: sb.chapterIndex,
              scrollPosition: sb.scrollPosition,
              note: sb.note,
              createdAt: sb.createdAt,
              updatedAt: sb.updatedAt,
              serverId: sb.id,
            });
          } else {
            const local = bookmarks.value[bookId].find(b => b.id === sb.id);
            Object.assign(local, {
              title: sb.title,
              chapterIndex: sb.chapterIndex,
              scrollPosition: sb.scrollPosition,
              note: sb.note,
              createdAt: sb.createdAt,
              updatedAt: sb.updatedAt,
              serverId: sb.id,
            });
            console.log('[bookmarks] sync updated local from server', {
              bookId,
              id: sb.id,
              local,
            });
          }
        });

        saveBookmarksToLocal();
        console.log('[bookmarks] syncAllBookmarks finished merged', {
          bookmarks: bookmarks.value,
        });
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

      // 本地删除
      delete bookmarks.value[bookId];
      saveBookmarksToLocal();

      // 从服务器删除
      try {
        await bookmarksApi.deleteByBookId(bookId);
      } catch (error) {
        console.warn('从服务器删除书籍书签失败:', error);
      }
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
    syncAllBookmarks,
    deleteBookmarksByBookId,
    saveBookmarksToLocal,
    loadBookmarksFromLocal,
  };
}

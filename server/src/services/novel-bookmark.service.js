import { NovelBookmarkModel } from '../models/novel-bookmark.model.js';

export class NovelBookmarkService {
  constructor(db) {
    this.bookmarkModel = new NovelBookmarkModel(db);
  }

  async createBookmark(bookmarkData) {
    try {
      const bookmark = this.bookmarkModel.create(bookmarkData);
      return {
        success: true,
        data: bookmark,
      };
    } catch (error) {
      console.error('创建书签失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getBookmarksByBookId(bookId) {
    try {
      const bookmarks = this.bookmarkModel.findByBookId(bookId);
      return {
        success: true,
        data: bookmarks,
      };
    } catch (error) {
      console.error('获取书签失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getBookmarksByFileId(fileId) {
    try {
      const bookmarks = this.bookmarkModel.findByFileId(fileId);
      return {
        success: true,
        data: bookmarks,
      };
    } catch (error) {
      console.error('获取书签失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateBookmark(id, updates) {
    try {
      const bookmark = this.bookmarkModel.update(id, updates);
      if (!bookmark) {
        return {
          success: false,
          error: '书签不存在或已被删除',
        };
      }
      return {
        success: true,
        data: bookmark,
      };
    } catch (error) {
      console.error('更新书签失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteBookmark(id) {
    try {
      console.log('[novel-bookmark-service] deleteBookmark called', { id });
      const result = this.bookmarkModel.delete(id);
      return {
        success: true,
        data: { deleted: result.changes > 0 },
      };
    } catch (error) {
      console.error('删除书签失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteBookmarksByBookId(bookId) {
    try {
      const result = this.bookmarkModel.deleteByBookId(bookId);
      return {
        success: true,
        data: { deleted: result.changes },
      };
    } catch (error) {
      console.error('删除书籍书签失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async syncBookmarks(deviceId, localBookmarks) {
    try {
      console.log('[novel-bookmark-service] syncBookmarks start', {
        deviceId,
        localCount: Array.isArray(localBookmarks) ? localBookmarks.length : 0,
      });

      // 获取服务器上的书签（改为返回所有书签，确保跨设备可见）
      const serverBookmarks = this.bookmarkModel.findAll();
      console.log('[novel-bookmark-service] serverBookmarks loaded', {
        count: Array.isArray(serverBookmarks) ? serverBookmarks.length : 0,
      });

      // 创建本地书签的映射
      const localBookmarkMap = new Map();
      localBookmarks.forEach(bookmark => {
        localBookmarkMap.set(bookmark.id, bookmark);
      });

      // 创建服务器书签的映射
      const serverBookmarkMap = new Map();
      serverBookmarks.forEach(bookmark => {
        serverBookmarkMap.set(bookmark.id, bookmark);
      });

      // 用于避免重复与“删除后复活”的辅助集合（按语义去重）
      const serverDupKeys = new Set(
        serverBookmarks.map(b =>
          [b.book_id || b.bookId, b.chapter_index || b.chapterIndex, b.scroll_position || b.scrollPosition, (b.title || '').slice(0, 120)].join('|')
        )
      );

      const isServerOwnedId = id => {
        const s = String(id);
        return /^\d+$/.test(s);
      };

      // 需要上传到服务器的书签（本地有但服务器没有）
      let bookmarksToUpload = localBookmarks.filter(bookmark => {
        if (!bookmark || !bookmark.id) return false;
        // 若服务器已存在同 ID，跳过
        if (serverBookmarkMap.has(bookmark.id)) return false;
        // 若是“看起来像服务器生成的 ID”（纯数字），说明是历史服务器项，若服务器已不存在（被其他设备删除），则禁止复活
        if (isServerOwnedId(bookmark.id)) return false;
        return true;
      });

      // 进一步：按语义去重，若服务器已有同一 (bookId, chapterIndex, scrollPosition, title) 的项，则不上传
      bookmarksToUpload = bookmarksToUpload.filter(b => {
        const key = [b.bookId, b.chapterIndex, b.scrollPosition, (b.title || '').slice(0, 120)].join('|');
        return !serverDupKeys.has(key);
      });
      console.log('[novel-bookmark-service] bookmarksToUpload', {
        count: bookmarksToUpload.length,
        sampleIds: bookmarksToUpload.map(b => b.id).slice(0, 20),
      });

      // 需要下载到本地的书签（服务器有但本地没有）
      const bookmarksToDownload = serverBookmarks.filter(
        bookmark => bookmark && bookmark.id && !localBookmarkMap.has(bookmark.id)
      );
      console.log('[novel-bookmark-service] bookmarksToDownload', {
        count: bookmarksToDownload.length,
      });

      // 批量上传新书签
      let uploadedBookmarks = [];
      if (bookmarksToUpload.length > 0) {
        uploadedBookmarks = this.bookmarkModel.batchCreate(
          bookmarksToUpload.map(bookmark => ({
            ...bookmark,
            deviceId,
          }))
        );
        console.log('[novel-bookmark-service] uploadedBookmarks', {
          count: uploadedBookmarks.length,
          ids: uploadedBookmarks.map(b => b.id).slice(0, 20),
        });
      }

      return {
        success: true,
        data: {
          uploaded: uploadedBookmarks,
          toDownload: bookmarksToDownload,
          serverBookmarks,
        },
      };
    } catch (error) {
      console.error('同步书签失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getAllBookmarks() {
    try {
      const bookmarks = this.bookmarkModel.findAll();
      return {
        success: true,
        data: bookmarks,
      };
    } catch (error) {
      console.error('获取所有书签失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

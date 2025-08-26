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
      // 获取服务器上的书签（改为返回所有书签，确保跨设备可见）
      const serverBookmarks = this.bookmarkModel.findAll();

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

      // 需要上传到服务器的书签（本地有但服务器没有）
      const bookmarksToUpload = localBookmarks.filter(
        bookmark => !serverBookmarkMap.has(bookmark.id)
      );

      // 需要下载到本地的书签（服务器有但本地没有）
      const bookmarksToDownload = serverBookmarks.filter(
        bookmark => !localBookmarkMap.has(bookmark.id)
      );

      // 批量上传新书签
      let uploadedBookmarks = [];
      if (bookmarksToUpload.length > 0) {
        uploadedBookmarks = this.bookmarkModel.batchCreate(
          bookmarksToUpload.map(bookmark => ({
            ...bookmark,
            deviceId,
          }))
        );
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

import { NovelBookmarkService } from '../services/novel-bookmark.service.js';

export class NovelBookmarkController {
  constructor(db) {
    this.bookmarkService = new NovelBookmarkService(db);
  }

  async createBookmark(req, res) {
    try {
      const {
        bookId,
        fileId,
        title,
        chapterIndex,
        scrollPosition,
        note,
        deviceId,
      } = req.body;

      if (!bookId || !title) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数：bookId 和 title',
        });
      }

      const result = await this.bookmarkService.createBookmark({
        bookId,
        fileId,
        title,
        chapterIndex: chapterIndex || 0,
        scrollPosition: scrollPosition || 0,
        note,
        deviceId,
      });

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('创建书签控制器错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getBookmarksByBookId(req, res) {
    try {
      const { bookId } = req.params;

      if (!bookId) {
        return res.status(400).json({
          success: false,
          error: '缺少 bookId 参数',
        });
      }

      const result = await this.bookmarkService.getBookmarksByBookId(bookId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('获取书签控制器错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getBookmarksByFileId(req, res) {
    try {
      const { fileId } = req.params;

      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: '缺少 fileId 参数',
        });
      }

      const result = await this.bookmarkService.getBookmarksByFileId(fileId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('获取书签控制器错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async updateBookmark(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '缺少书签ID',
        });
      }

      const result = await this.bookmarkService.updateBookmark(id, updates);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('更新书签控制器错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async deleteBookmark(req, res) {
    try {
      const { id } = req.params;
      console.log('[novel-bookmark] deleteBookmark request', { id });

      if (!id) {
        return res.status(400).json({
          success: false,
          error: '缺少书签ID',
        });
      }

      const result = await this.bookmarkService.deleteBookmark(id);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('删除书签控制器错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async deleteBookmarksByBookId(req, res) {
    try {
      const { bookId } = req.params;

      if (!bookId) {
        return res.status(400).json({
          success: false,
          error: '缺少 bookId 参数',
        });
      }

      const result = await this.bookmarkService.deleteBookmarksByBookId(bookId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('删除书籍书签控制器错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async syncBookmarks(req, res) {
    try {
      const { deviceId, bookmarks } = req.body;
      console.log('[novel-bookmark] syncBookmarks request', {
        deviceId,
        bookmarksLength: Array.isArray(bookmarks) ? bookmarks.length : 0,
      });

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          error: '缺少 deviceId 参数',
        });
      }

      const result = await this.bookmarkService.syncBookmarks(
        deviceId,
        bookmarks || []
      );

      console.log('[novel-bookmark] syncBookmarks result', {
        success: result && result.success,
        uploaded: result?.data?.uploaded?.length,
        toDownload: result?.data?.toDownload?.length,
        serverBookmarks: result?.data?.serverBookmarks?.length,
      });

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('同步书签控制器错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }

  async getAllBookmarks(req, res) {
    try {
      const result = await this.bookmarkService.getAllBookmarks();

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('获取所有书签控制器错误:', error);
      res.status(500).json({
        success: false,
        error: '服务器内部错误',
      });
    }
  }
}

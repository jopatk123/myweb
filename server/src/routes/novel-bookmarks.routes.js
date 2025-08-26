import express from 'express';
import { NovelBookmarkController } from '../controllers/novel-bookmark.controller.js';

export function createNovelBookmarkRoutes(db) {
  const router = express.Router();
  const bookmarkController = new NovelBookmarkController(db);

  // 创建书签
  router.post('/', (req, res) => bookmarkController.createBookmark(req, res));

  // 获取指定书籍的所有书签
  router.get('/book/:bookId', (req, res) =>
    bookmarkController.getBookmarksByBookId(req, res)
  );

  // 获取指定文件的所有书签
  router.get('/file/:fileId', (req, res) =>
    bookmarkController.getBookmarksByFileId(req, res)
  );

  // 更新书签
  router.put('/:id', (req, res) => bookmarkController.updateBookmark(req, res));

  // 删除单个书签
  router.delete('/:id', (req, res) =>
    bookmarkController.deleteBookmark(req, res)
  );

  // 删除指定书籍的所有书签
  router.delete('/book/:bookId', (req, res) =>
    bookmarkController.deleteBookmarksByBookId(req, res)
  );

  // 同步书签
  router.post('/sync', (req, res) =>
    bookmarkController.syncBookmarks(req, res)
  );

  // 获取所有书签（管理员功能）
  router.get('/', (req, res) => bookmarkController.getAllBookmarks(req, res));

  return router;
}

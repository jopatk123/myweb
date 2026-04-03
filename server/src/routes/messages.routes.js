/**
 * 留言路由（工厂函数模式，接收 db 实例）
 */
import express from 'express';
import {
  MessageController,
  uploadImage,
  MESSAGE_IMAGE_MAX_FILES,
} from '../controllers/message.controller.js';
import { createFilesAdminGuard } from '../middleware/adminAuth.middleware.js';
import {
  validateBody,
  sendMessageSchema,
  updateUserSettingsSchema,
  clearAllMessagesSchema,
  getMessagesSchema,
} from '../dto/message.dto.js';
import { validateQuery } from '../dto/wallpaper.dto.js';

export function createMessageRoutes(db) {
  const router = express.Router();
  const controller = new MessageController(db);
  const adminGuard = createFilesAdminGuard();

  // 获取留言列表
  router.get('/', validateQuery(getMessagesSchema), (req, res, next) =>
    controller.getMessages(req, res, next)
  );

  // 发送留言
  router.post('/', validateBody(sendMessageSchema), (req, res, next) =>
    controller.sendMessage(req, res, next)
  );

  // 获取用户设置
  router.get('/user-settings', (req, res, next) =>
    controller.getUserSettings(req, res, next)
  );

  // 更新用户设置
  router.put(
    '/user-settings',
    validateBody(updateUserSettingsSchema),
    (req, res, next) => controller.updateUserSettings(req, res, next)
  );

  // 上传图片
  router.post(
    '/upload-image',
    uploadImage.array('images', MESSAGE_IMAGE_MAX_FILES),
    (req, res, next) => controller.uploadImageHandler(req, res, next)
  );

  // 清除所有留言（需要管理员权限）
  router.delete(
    '/clear-all',
    adminGuard,
    validateBody(clearAllMessagesSchema),
    (req, res, next) => controller.clearAllMessages(req, res, next)
  );

  // 删除留言（需要管理员权限）
  router.delete('/:id', adminGuard, (req, res, next) =>
    controller.deleteMessage(req, res, next)
  );

  return router;
}

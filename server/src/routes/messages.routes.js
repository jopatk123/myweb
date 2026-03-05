/**
 * 留言路由
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

const router = express.Router();
const adminGuard = createFilesAdminGuard();

// 获取留言列表
router.get(
  '/',
  validateQuery(getMessagesSchema),
  MessageController.getMessages
);

// 发送留言
router.post(
  '/',
  validateBody(sendMessageSchema),
  MessageController.sendMessage
);

// 获取用户设置
router.get('/user-settings', MessageController.getUserSettings);

// 更新用户设置
router.put(
  '/user-settings',
  validateBody(updateUserSettingsSchema),
  MessageController.updateUserSettings
);

// 上传图片
router.post(
  '/upload-image',
  uploadImage.array('images', MESSAGE_IMAGE_MAX_FILES),
  MessageController.uploadImage
);

// 清除所有留言（需要管理员权限）
router.delete(
  '/clear-all',
  adminGuard,
  validateBody(clearAllMessagesSchema),
  MessageController.clearAllMessages
);

// 删除留言（需要管理员权限）
router.delete('/:id', adminGuard, MessageController.deleteMessage);

export default router;

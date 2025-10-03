/**
 * 留言路由
 */
import express from 'express';
import {
  MessageController,
  uploadImage,
  MESSAGE_IMAGE_MAX_FILES,
} from '../controllers/message.controller.js';

const router = express.Router();

// 获取留言列表
router.get('/', MessageController.getMessages);

// 发送留言
router.post('/', MessageController.sendMessage);

// 获取用户设置
router.get('/user-settings', MessageController.getUserSettings);

// 更新用户设置
router.put('/user-settings', MessageController.updateUserSettings);

// 上传图片
router.post(
  '/upload-image',
  uploadImage.array('images', MESSAGE_IMAGE_MAX_FILES),
  MessageController.uploadImage
);

// 清除所有留言
router.delete('/clear-all', MessageController.clearAllMessages);

// 删除留言（管理功能）
router.delete('/:id', MessageController.deleteMessage);

export default router;

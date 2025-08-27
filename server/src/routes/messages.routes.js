/**
 * 留言路由
 */
import express from 'express';
import { MessageController } from '../controllers/message.controller.js';

const router = express.Router();

// 获取留言列表
router.get('/', MessageController.getMessages);

// 发送留言
router.post('/', MessageController.sendMessage);

// 删除留言（管理功能）
router.delete('/:id', MessageController.deleteMessage);

// 获取用户设置
router.get('/user-settings', MessageController.getUserSettings);

// 更新用户设置
router.put('/user-settings', MessageController.updateUserSettings);

export default router;
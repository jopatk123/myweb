/**
 * 贪吃蛇多人游戏路由
 */
import { Router } from 'express';
import { SnakeMultiplayerController } from '../controllers/snake-multiplayer.controller.js';

export const createSnakeMultiplayerRoutes = () => {
  const router = Router();

  // 获取活跃房间列表
  router.get('/rooms', SnakeMultiplayerController.getActiveRooms);

  // 获取房间详情
  router.get('/rooms/:roomCode', SnakeMultiplayerController.getRoomDetail);

  // 清理离线玩家（管理员功能）
  router.post('/cleanup', SnakeMultiplayerController.cleanupOfflinePlayers);

  return router;
};

import express from 'express';
import { LogController } from '../controllers/log.controller.js';

export function createLogRoutes() {
  const router = express.Router();
  const controller = new LogController();

  // 获取AI对话日志
  router.get('/ai', (req, res, next) => controller.getAILogs(req, res, next));
  
  // 获取日志统计信息
  router.get('/ai/stats', (req, res, next) => controller.getLogStats(req, res, next));
  
  // 清空AI对话日志（需要管理员权限，这里暂时简化）
  router.delete('/ai', (req, res, next) => controller.clearAILogs(req, res, next));

  return router;
}

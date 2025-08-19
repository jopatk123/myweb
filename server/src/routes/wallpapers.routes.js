import express from 'express';
import { WallpaperController } from '../controllers/wallpaper.controller.js';

export function createWallpaperRoutes(db) {
  const router = express.Router();
  const controller = new WallpaperController(db);

  // 壁纸路由
  router.get('/', (req, res, next) => controller.getWallpapers(req, res, next));
  router.get('/active', (req, res, next) => controller.getActiveWallpaper(req, res, next));
  router.get('/random', (req, res, next) => controller.getRandomWallpaper(req, res, next));
  router.get('/:id', (req, res, next) => controller.getWallpaper(req, res, next));
  
  router.post('/', controller.upload.single('image'), (req, res, next) => controller.uploadWallpaper(req, res, next));
  
  // 批量操作
  router.delete('/', (req, res, next) => controller.deleteWallpapers(req, res, next));
  router.put('/move', (req, res, next) => controller.moveWallpapers(req, res, next));

  router.put('/:id', (req, res, next) => controller.updateWallpaper(req, res, next));
  router.put('/:id/active', (req, res, next) => controller.setActiveWallpaper(req, res, next));
  router.delete('/:id', (req, res, next) => controller.deleteWallpaper(req, res, next));

  // 分组路由
  router.get('/groups/all', (req, res, next) => controller.getGroups(req, res, next));
  router.post('/groups', (req, res, next) => controller.createGroup(req, res, next));
  router.put('/groups/:id', (req, res, next) => controller.updateGroup(req, res, next));
  router.delete('/groups/:id', (req, res, next) => controller.deleteGroup(req, res, next));

  return router;
}
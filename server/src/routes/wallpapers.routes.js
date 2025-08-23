import express from 'express';
import { WallpaperController } from '../controllers/wallpaper.controller.js';
import {
  validateBody,
  uploadWallpaperSchema,
  deleteWallpapersSchema,
  moveWallpapersSchema,
  updateGroupSchema,
  createGroupSchema,
  updateWallpaperSchema,
} from '../dto/wallpaper.dto.js';

export function createWallpaperRoutes(db) {
  const router = express.Router();
  const controller = new WallpaperController(db);

  // 壁纸路由
  router.get('/', (req, res, next) => controller.getWallpapers(req, res, next));
  router.get('/active', (req, res, next) =>
    controller.getActiveWallpaper(req, res, next)
  );
  router.get('/random', (req, res, next) =>
    controller.getRandomWallpaper(req, res, next)
  );
  router.get('/:id(\\d+)', (req, res, next) =>
    controller.getWallpaper(req, res, next)
  );

  // 对于 multipart 表单，multer 处理后需归一化键名
  router.post(
    '/',
    controller.upload.single('image'),
    validateBody(uploadWallpaperSchema),
    (req, res, next) => controller.uploadWallpaper(req, res, next)
  );

  // 批量操作
  router.delete('/', validateBody(deleteWallpapersSchema), (req, res, next) =>
    controller.deleteWallpapers(req, res, next)
  );
  router.put('/move', validateBody(moveWallpapersSchema), (req, res, next) =>
    controller.moveWallpapers(req, res, next)
  );

  router.put(
    '/:id(\\d+)',
    validateBody(updateWallpaperSchema),
    (req, res, next) => controller.updateWallpaper(req, res, next)
  );
  router.put('/:id(\\d+)/active', (req, res, next) =>
    controller.setActiveWallpaper(req, res, next)
  );
  router.delete('/:id(\\d+)', (req, res, next) =>
    controller.deleteWallpaper(req, res, next)
  );

  // 分组路由
  router.get('/groups/all', (req, res, next) =>
    controller.getGroups(req, res, next)
  );
  router.post('/groups', validateBody(createGroupSchema), (req, res, next) =>
    controller.createGroup(req, res, next)
  );
  router.put('/groups/:id', validateBody(updateGroupSchema), (req, res, next) =>
    controller.updateGroup(req, res, next)
  );
  router.delete('/groups/:id', (req, res, next) =>
    controller.deleteGroup(req, res, next)
  );
  router.get('/groups/current', (req, res, next) =>
    controller.getCurrentGroup(req, res, next)
  );
  router.put('/groups/:id/current', (req, res, next) =>
    controller.setCurrentGroup(req, res, next)
  );

  return router;
}

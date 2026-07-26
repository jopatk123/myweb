import express from 'express';
import { AppController } from '../controllers/app.controller.js';
import fs from 'fs/promises';
import { parseEnvByteSize } from '../utils/env.js';
import { APP_ICONS_DIR } from '../utils/upload-path.js';
import { createUploader, imageOnlyFilter } from '../utils/uploader.js';
import { assertValidImageFile } from '../utils/magic-bytes.js';
import { validateBody } from '../dto/common.js';
import {
  bulkVisibleSchema,
  createGroupSchema,
  moveAppsSchema,
  setAutostartSchema,
  setVisibleSchema,
  updateGroupSchema,
} from '../dto/app.dto.js';
import logger from '../utils/logger.js';

const iconLogger = logger.child('AppIconUpload');

export function createAppRoutes(db) {
  const router = express.Router();
  const controller = new AppController(db);

  // 图标上传配置：保存到 uploads/apps/icons，测试场景可通过 APP_ICON_UPLOAD_DIR 覆盖
  const DEFAULT_APP_ICON_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MiB
  const APP_ICON_UPLOAD_SIZE = parseEnvByteSize(
    'APP_ICON_MAX_UPLOAD_SIZE',
    DEFAULT_APP_ICON_UPLOAD_SIZE
  );
  const APP_ICON_UPLOAD_DIR = process.env.APP_ICON_UPLOAD_DIR || APP_ICONS_DIR;

  // 复用统一的上传工厂：imageOnlyFilter 拒绝非图片，assertValidImageFile 再做魔数校验
  const upload = createUploader({
    destination: APP_ICON_UPLOAD_DIR,
    maxFileSize: APP_ICON_UPLOAD_SIZE,
    fileFilter: imageOnlyFilter,
  });

  // 应用
  router.get('/', (req, res, next) => controller.list(req, res, next));
  router.get('/:id(\\d+)', (req, res, next) => controller.get(req, res, next));
  router.post('/', (req, res, next) => controller.create(req, res, next));
  router.put(
    '/:id(\\d+)/visible',
    validateBody(setVisibleSchema),
    (req, res, next) => controller.setVisible(req, res, next)
  );
  // slug 模式：支持按 slug 切换自启动
  router.put(
    '/:id/autostart',
    validateBody(setAutostartSchema),
    (req, res, next) => controller.setAutostart(req, res, next)
  );
  router.put(
    '/bulk/visible',
    validateBody(bulkVisibleSchema),
    (req, res, next) => controller.bulkVisible(req, res, next)
  );
  router.put('/move', validateBody(moveAppsSchema), (req, res, next) =>
    controller.move(req, res, next)
  );
  router.put('/:id(\\d+)', (req, res, next) =>
    controller.update(req, res, next)
  );
  router.delete('/:id(\\d+)', (req, res, next) =>
    controller.remove(req, res, next)
  );

  // 上传图标：imageOnlyFilter 已拒绝非图片 MIME，此处再做魔数校验防止伪造
  router.post(
    '/icons/upload',
    upload.single('file'),
    async (req, res, next) => {
      const f = req.file;
      if (!f) {
        return res.status(400).json({ code: 400, message: '请选择文件' });
      }

      try {
        await assertValidImageFile(f.path, f.mimetype);
      } catch (err) {
        await fs.unlink(f.path).catch(cleanupErr => {
          iconLogger.warn('魔数校验失败后清理文件出错', {
            filename: f.filename,
            error: cleanupErr?.message,
          });
        });
        return next(err);
      }

      try {
        res.status(201).json({
          code: 201,
          data: {
            filename: f.filename,
            path: `/uploads/apps/icons/${f.filename}`,
          },
          message: '上传成功',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // 分组
  router.get('/groups/all', (req, res, next) =>
    controller.listGroups(req, res, next)
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

  // 调试：未匹配到的 apps 子路由（不回显 originalUrl，避免泄露内部路径信息）
  router.use((req, res) => {
    res.status(404).json({
      code: 404,
      message: 'Subroute Not Found',
      method: req.method,
    });
  });

  return router;
}

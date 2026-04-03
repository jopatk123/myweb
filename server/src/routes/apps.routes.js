import express from 'express';
import { AppController } from '../controllers/app.controller.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { parseEnvByteSize } from '../utils/env.js';

export function createAppRoutes(db) {
  const router = express.Router();
  const controller = new AppController(db);
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // 图标上传配置：保存到 uploads/apps/icons，测试场景可通过 APP_ICON_UPLOAD_DIR 覆盖
  const DEFAULT_APP_ICON_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MiB
  const APP_ICON_UPLOAD_SIZE = parseEnvByteSize(
    'APP_ICON_MAX_UPLOAD_SIZE',
    DEFAULT_APP_ICON_UPLOAD_SIZE
  );
  const DEFAULT_APP_ICON_UPLOAD_DIR = path.join(
    __dirname,
    '../../uploads/apps/icons'
  );
  const APP_ICON_UPLOAD_DIR =
    process.env.APP_ICON_UPLOAD_DIR || DEFAULT_APP_ICON_UPLOAD_DIR;

  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await fs.promises.mkdir(APP_ICON_UPLOAD_DIR, { recursive: true });
      } catch (e) {
        // ignore if exists or cannot create, multer will error if needed
      }
      cb(null, APP_ICON_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      cb(null, `${uuidv4()}${ext}`);
    },
  });
  const upload = multer({
    storage,
    limits: { fileSize: APP_ICON_UPLOAD_SIZE },
  });

  // 应用
  router.get('/', (req, res, next) => controller.list(req, res, next));
  router.get('/:id(\\d+)', (req, res, next) => controller.get(req, res, next));
  router.post('/', (req, res, next) => controller.create(req, res, next));
  router.put('/:id(\\d+)/visible', (req, res, next) =>
    controller.setVisible(req, res, next)
  );
  // slug 模式：支持按 slug 切换自启动
  router.put('/:id/autostart', (req, res, next) =>
    controller.setAutostart(req, res, next)
  );
  router.put('/:id(\\d+)/autostart', (req, res, next) =>
    controller.setAutostart(req, res, next)
  );
  router.put('/bulk/visible', (req, res, next) =>
    controller.bulkVisible(req, res, next)
  );
  router.put('/move', (req, res, next) => controller.move(req, res, next));
  router.put('/:id(\\d+)', (req, res, next) =>
    controller.update(req, res, next)
  );
  router.delete('/:id(\\d+)', (req, res, next) =>
    controller.remove(req, res, next)
  );

  // 上传图标
  router.post('/icons/upload', upload.single('file'), (req, res, next) => {
    try {
      const f = req.file;
      if (!f) return res.status(400).json({ code: 400, message: '请选择文件' });
      res.status(201).json({
        code: 201,
        data: {
          filename: f.filename,
          path: `/uploads/apps/icons/${f.filename}`,
        },
        message: '上传成功',
      });
    } catch (e) {
      next(e);
    }
  });

  // 分组
  router.get('/groups/all', (req, res, next) =>
    controller.listGroups(req, res, next)
  );
  router.post('/groups', (req, res, next) =>
    controller.createGroup(req, res, next)
  );
  router.put('/groups/:id', (req, res, next) =>
    controller.updateGroup(req, res, next)
  );
  router.delete('/groups/:id', (req, res, next) =>
    controller.deleteGroup(req, res, next)
  );

  // 调试：未匹配到的 myapps 子路由
  router.use((req, res) => {
    res.status(404).json({
      code: 404,
      message: 'Subroute Not Found',
      path: req.originalUrl,
      method: req.method,
    });
  });

  return router;
}

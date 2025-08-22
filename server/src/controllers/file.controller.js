import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { FileService } from '../services/file.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/files'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }
});

export function createFileRoutes(db) {
  const router = express.Router();
  const service = new FileService(db);

  // 上传（支持多文件）
  router.post('/upload', upload.array('file', 10), async (req, res, next) => {
    try {
      const baseUrl = (req.get('x-api-base') || '').trim();
      const files = req.files || [];
      if (!files.length) return res.status(400).json({ code: 400, success: false, message: '请选择文件' });

      const results = files.map((f) => {
        const webPath = path.posix.join('uploads', 'files', f.filename);
        return service.create({
          originalName: f.originalname,
          storedName: f.filename,
          filePath: webPath,
          mimeType: f.mimetype,
          fileSize: f.size,
          uploaderId: null,
          baseUrl
        });
      });

      const data = Array.isArray(results) && results.length === 1 ? results[0] : results;
      res.status(201).json({ code: 201, success: true, data, message: '上传成功' });
    } catch (error) {
      next(error);
    }
  });

  // 列表
  router.get('/', async (req, res, next) => {
    try {
      const { page = 1, limit = 20, type = '', search = '' } = req.query;
      const result = service.list({ page: Number(page), limit: Number(limit), type: type || null, search: search || null });
      res.json({ code: 200, success: true, data: { files: result.items, pagination: { page: Number(page), limit: Number(limit), total: result.total, totalPages: Math.ceil(result.total / Number(limit || 1)) } }, message: '获取成功' });
    } catch (error) { next(error); }
  });

  // 详情
  router.get('/:id', async (req, res, next) => {
    try {
      const row = service.get(req.params.id);
      res.json({ code: 200, success: true, data: row, message: '获取成功' });
    } catch (error) { next(error); }
  });

  // 下载
  router.get('/:id/download', async (req, res, next) => {
    try {
      const row = service.get(req.params.id);
      // 将相对路径解析为磁盘路径
      let diskPath = row.file_path;
      if (!path.isAbsolute(diskPath)) {
        diskPath = path.join(__dirname, '../../', row.file_path);
      }
      res.setHeader('Content-Type', row.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`);
      res.download(diskPath);
    } catch (error) { next(error); }
  });

  // 删除
  router.delete('/:id', async (req, res, next) => {
    try {
      await service.remove(req.params.id);
      res.json({ code: 200, success: true, message: '文件删除成功' });
    } catch (error) { next(error); }
  });

  return router;
}



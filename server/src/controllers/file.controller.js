import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import jschardet from 'jschardet';
import iconv from 'iconv-lite';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { FileService } from '../services/file.service.js';
import { NovelModel } from '../models/novel.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/files'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1000 * 1024 * 1024 }, // 1GB - 放开限制供私人使用
});

// Ensure novels upload directory exists and provide a dedicated storage for novels
const novelsDir = path.join(__dirname, '../../uploads/novels');
if (!fs.existsSync(novelsDir)) {
  try {
    fs.mkdirSync(novelsDir, { recursive: true });
  } catch (e) {
    console.warn('无法创建 novels 上传目录:', e.message);
  }
}

const storageNovels = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, novelsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const uploadNovels = multer({
  storage: storageNovels,
  limits: { fileSize: 1000 * 1024 * 1024 }, // 1GB - 放开限制供私人使用
});

export function createFileRoutes(db) {
  const router = express.Router();
  const service = new FileService(db);
  const novelModel = new NovelModel(db);

  // 上传（支持多文件）
  router.post('/upload', upload.array('file', 10), async (req, res, next) => {
    try {
      const baseUrl = (req.get('x-api-base') || '').trim();
      const files = req.files || [];
      if (!files.length)
        return res
          .status(400)
          .json({ code: 400, success: false, message: '请选择文件' });

      const results = files.map(f => {
        const webPath = path.posix.join('uploads', 'files', f.filename);
        return service.create({
          originalName: f.originalname,
          storedName: f.filename,
          filePath: webPath,
          mimeType: f.mimetype,
          fileSize: f.size,
          uploaderId: null,
          baseUrl,
        });
      });

      const data =
        Array.isArray(results) && results.length === 1 ? results[0] : results;
      res
        .status(201)
        .json({ code: 201, success: true, data, message: '上传成功' });
    } catch (error) {
      next(error);
    }
  });

  // 专用于小说上传的端点，保存到 uploads/novels
  router.post(
    '/upload/novel',
    uploadNovels.array('file', 10),
    async (req, res, next) => {
      try {
        const baseUrl = (req.get('x-api-base') || '').trim();
        const files = req.files || [];
        if (!files.length)
          return res
            .status(400)
            .json({ code: 400, success: false, message: '请选择文件' });

        const fileResults = [];
        const novelResults = [];
        for (const f of files) {
          const webPath = path.posix.join('uploads', 'novels', f.filename);
          const diskPath = path.join(novelsDir, f.filename);
          // 统一检测编码并转换为 UTF-8，覆盖磁盘文件以便后续读取一致
          try {
            const buf = await fsPromises.readFile(diskPath);
            const detected = jschardet.detect(buf) || {};
            const enc = (detected.encoding || '').toLowerCase();
            if (!enc || !enc.includes('utf')) {
              const fromEnc = /gb/.test(enc) ? 'gb18030' : enc || 'gb18030';
              const str = iconv.decode(buf, fromEnc);
              await fsPromises.writeFile(diskPath, Buffer.from(str, 'utf8'));
            }
          } catch (convErr) {
            console.warn(
              '小说文件编码转换失败：',
              diskPath,
              convErr && convErr.message
            );
          }
          // 将 files 与 novels 的写入包裹在同一事务中
          const db = service.model.db;
          const txn = db.transaction(() => {
            const fileRow = service.create({
              originalName: f.originalname,
              storedName: f.filename,
              filePath: webPath,
              mimeType: f.mimetype,
              fileSize: f.size,
              uploaderId: null,
              baseUrl,
              typeCategory: 'novel',
            });
            const novelRow = novelModel.create({
              title: f.originalname.replace(/\.[^/.]+$/, ''),
              author: null,
              originalName: f.originalname,
              storedName: f.filename,
              filePath: webPath,
              mimeType: f.mimetype,
              fileSize: f.size,
              fileUrl: `${baseUrl ? `${baseUrl}/` : ''}${webPath}`.replace(
                /\/+/g,
                '/'
              ),
              uploaderId: null,
            });
            fileResults.push(fileRow);
            novelResults.push(novelRow);
          });

          try {
            txn();
          } catch (dbErr) {
            // 单文件失败时仅清理当前文件，继续处理其它文件
            try {
              await fsPromises.unlink(diskPath);
            } catch (unlinkErr) {
              console.warn(
                '无法删除失败交易产生的文件：',
                diskPath,
                unlinkErr && unlinkErr.message
              );
            }
            console.warn(
              'novel upload transaction failed for',
              diskPath,
              dbErr && dbErr.message
            );
            continue;
          }
        }

        if (fileResults.length === 0) {
          return res
            .status(500)
            .json({ code: 500, success: false, message: '小说上传失败' });
        }

        const data =
          Array.isArray(fileResults) && fileResults.length === 1
            ? fileResults[0]
            : fileResults;
        const novels =
          Array.isArray(novelResults) && novelResults.length === 1
            ? novelResults[0]
            : novelResults;
        res.status(201).json({
          code: 201,
          success: true,
          data,
          novels,
          message: '小说上传成功',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  // 列表
  router.get('/', async (req, res, next) => {
    try {
      const { page = 1, limit = 20, type = '', search = '' } = req.query;
      const result = service.list({
        page: Number(page),
        limit: Number(limit),
        type: type || null,
        search: search || null,
      });
      res.json({
        code: 200,
        success: true,
        data: {
          files: result.items,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: result.total,
            totalPages: Math.ceil(result.total / Number(limit || 1)),
          },
        },
        message: '获取成功',
      });
    } catch (error) {
      next(error);
    }
  });

  // 详情
  router.get('/:id', async (req, res, next) => {
    try {
      const row = service.get(req.params.id);
      res.json({ code: 200, success: true, data: row, message: '获取成功' });
    } catch (error) {
      next(error);
    }
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
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`
      );
      res.download(diskPath);
    } catch (error) {
      next(error);
    }
  });

  // 删除
  router.delete('/:id', async (req, res, next) => {
    try {
      await service.remove(req.params.id);
      res.json({ code: 200, success: true, message: '文件删除成功' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

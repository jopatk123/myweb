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
import { createFilesAdminGuard } from '../middleware/adminAuth.middleware.js';
import { parseEnvByteSize, parseEnvNumber } from '../utils/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsRoot = path.join(__dirname, '../../uploads');
const filesDir = path.join(uploadsRoot, 'files');
const novelsDir = path.join(uploadsRoot, 'novels');
const DEFAULT_MAX_UPLOAD_SIZE = 1000 * 1024 * 1024; // 1GB
const MAX_UPLOAD_SIZE = parseEnvByteSize(
  'FILE_MAX_UPLOAD_SIZE',
  DEFAULT_MAX_UPLOAD_SIZE
);
const MAX_UPLOAD_FILES = Math.max(
  1,
  parseEnvNumber('FILE_MAX_UPLOAD_FILES', 10)
);

const allowedMimePatterns = [
  /^image\//i,
  /^video\//i,
  /^audio\//i,
  /^text\//i,
  /^application\/(pdf|zip|x-7z-compressed|x-rar-compressed|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|json)$/i,
];

const allowedExtensions = new Set(
  [
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.bmp',
    '.webp',
    '.svg',
    '.mp4',
    '.mkv',
    '.mov',
    '.avi',
    '.mp3',
    '.wav',
    '.flac',
    '.aac',
    '.ogg',
    '.m4a',
    '.wma',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.pdf',
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    '.tgz',
    '.txt',
    '.md',
    '.csv',
    '.json',
    '.log',
    '.epub',
  ].map(ext => ext.toLowerCase())
);

if (!fs.existsSync(filesDir)) {
  try {
    fs.mkdirSync(filesDir, { recursive: true });
  } catch (e) {
    console.warn('无法创建 files 上传目录:', e.message);
  }
}

function resolveBaseUrl(req) {
  const headerBase = (req.get('x-api-base') || '').trim();
  if (headerBase) {
    return headerBase.replace(/\/+$/, '');
  }
  const forwardedProto = (req.get('x-forwarded-proto') || '')
    .split(',')[0]
    ?.trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = (req.get('host') || '').trim();
  if (!host) return '';
  return `${protocol}://${host}`.replace(/\/+$/, '');
}

function isAllowedFile(file) {
  const mimetype = String(file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();
  return (
    allowedMimePatterns.some(regex => regex.test(mimetype)) ||
    allowedExtensions.has(ext)
  );
}

const fileFilter = (_req, file, cb) => {
  if (isAllowedFile(file)) {
    return cb(null, true);
  }
  const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
  err.message = '不支持的文件类型';
  return cb(err);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter,
});

// Ensure novels upload directory exists and provide a dedicated storage for novels
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
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter,
});

export function createFileRoutes(db) {
  const router = express.Router();
  const service = new FileService(db);
  const novelModel = new NovelModel(db);
  const adminGuard = createFilesAdminGuard();

  // 上传（支持多文件）
  router.post(
    '/upload',
    adminGuard,
    upload.array('file', MAX_UPLOAD_FILES),
    async (req, res, next) => {
      try {
        const baseUrl = resolveBaseUrl(req);
        const files = req.files || [];
        if (!files.length)
          return res
            .status(400)
            .json({ code: 400, success: false, message: '请选择文件' });

        const payloads = files.map(f => ({
          originalName: f.originalname,
          storedName: f.filename,
          filePath: path.posix.join('uploads', 'files', f.filename),
          mimeType: f.mimetype,
          fileSize: f.size,
          uploaderId: null,
          baseUrl,
        }));

        let results;
        try {
          results = service.createMany(payloads);
        } catch (createErr) {
          await Promise.allSettled(
            payloads.map(async p => {
              const diskPath = path.join(__dirname, '../../', p.filePath);
              try {
                await fsPromises.unlink(diskPath);
              } catch (unlinkErr) {
                if (unlinkErr?.code !== 'ENOENT') {
                  console.warn('上传失败，清理文件出错:', unlinkErr.message);
                }
              }
            })
          );
          throw createErr;
        }

        const data =
          Array.isArray(results) && results.length === 1 ? results[0] : results;
        res
          .status(201)
          .json({ code: 201, success: true, data, message: '上传成功' });
      } catch (error) {
        next(error);
      }
    }
  );

  // 专用于小说上传的端点，保存到 uploads/novels
  router.post(
    '/upload/novel',
    adminGuard,
    uploadNovels.array('file', MAX_UPLOAD_FILES),
    async (req, res, next) => {
      try {
        const baseUrl = resolveBaseUrl(req);
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
              fileUrl: fileRow.file_url || fileRow.fileUrl || null,
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
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: Math.max(
              1,
              Math.ceil(result.total / (result.limit || 1))
            ),
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
      const storedPath = row.file_path || row.filePath;
      if (!storedPath) {
        const err = new Error('文件路径缺失');
        err.status = 500;
        throw err;
      }

      const absolutePath = path.resolve(__dirname, '../../', storedPath);
      const uploadsRootResolved = path.resolve(uploadsRoot);
      if (!absolutePath.startsWith(uploadsRootResolved)) {
        const err = new Error('非法的文件路径');
        err.status = 400;
        throw err;
      }

      try {
        await fsPromises.access(absolutePath, fs.constants.R_OK);
      } catch (fsErr) {
        if (fsErr?.code === 'ENOENT') {
          const notFound = new Error('文件不存在或已被删除');
          notFound.status = 404;
          throw notFound;
        }
        throw fsErr;
      }

      res.setHeader(
        'Content-Type',
        row.mime_type || 'application/octet-stream'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(row.original_name)}`
      );
      res.download(absolutePath);
    } catch (error) {
      next(error);
    }
  });

  // 删除
  router.delete('/:id', adminGuard, async (req, res, next) => {
    try {
      await service.remove(req.params.id);
      res.json({ code: 200, success: true, message: '文件删除成功' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

import express from 'express';
import fs from 'fs';
import fsPromises from 'fs/promises';
import {
  FileService,
  detectTypeCategory,
  FILE_CATEGORIES,
} from '../services/file.service.js';
import { createFilesAdminGuard } from '../middleware/adminAuth.middleware.js';
import { parseEnvByteSize, parseEnvNumber } from '../utils/env.js';
import { normaliseUploadedFileName } from '../utils/upload.js';
import logger from '../utils/logger.js';
import { createUploader } from '../utils/uploader.js';
import { DEFAULT_FILE_MAX_SIZE } from '../constants/limits.js';
import { validateQuery, validateId, listFilesSchema } from '../dto/file.dto.js';
import {
  FILES_DIR,
  toUploadsAbsolutePath,
  toUploadsRelativePath,
} from '../utils/upload-path.js';

const fileLogger = logger.child('FileController');

const MAX_UPLOAD_SIZE = parseEnvByteSize(
  'FILE_MAX_UPLOAD_SIZE',
  DEFAULT_FILE_MAX_SIZE
);
const MAX_UPLOAD_FILES = Math.max(
  1,
  parseEnvNumber('FILE_MAX_UPLOAD_FILES', 10)
);

// 允许所有文件类型上传 - 可通过环境变量 FILE_ALLOW_ALL_TYPES=false 开启过滤

function isAllowedFile(file) {
  if (process.env.FILE_ALLOW_ALL_TYPES !== 'false') return true;
  const category = detectTypeCategory(file.mimetype, file.originalname);
  return category !== FILE_CATEGORIES.OTHER;
}

if (!fs.existsSync(FILES_DIR)) {
  try {
    fs.mkdirSync(FILES_DIR, { recursive: true });
  } catch (e) {
    fileLogger.warn('无法创建 files 上传目录', { error: e.message });
  }
}

function isTrustedBaseUrl(req, value) {
  try {
    const candidate = new URL(value);
    if (!['http:', 'https:'].includes(candidate.protocol)) {
      return false;
    }

    const requestHost = (req.get('host') || '').trim().toLowerCase();
    if (!requestHost) {
      return true;
    }

    return candidate.host.toLowerCase() === requestHost;
  } catch {
    return false;
  }
}

function resolveBaseUrl(req) {
  const headerBase = (req.get('x-api-base') || '').trim();
  if (headerBase && isTrustedBaseUrl(req, headerBase)) {
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

const fileFilter = (_req, file, cb) => {
  normaliseUploadedFileName(file);
  if (isAllowedFile(file)) {
    return cb(null, true);
  }
  const err = new Error('不支持的文件类型');
  err.status = 400;
  err.code = 'UNSUPPORTED_FILE_TYPE';
  err.field = file.fieldname;
  return cb(err);
};

const upload = createUploader({
  destination: FILES_DIR,
  maxFileSize: MAX_UPLOAD_SIZE,
  fileFilter,
});

export function createFileRoutes(db) {
  const router = express.Router();
  const service = new FileService(db);
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
          filePath: toUploadsRelativePath('files', f.filename),
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
              const diskPath = toUploadsAbsolutePath(p.filePath);
              if (!diskPath) return;
              try {
                await fsPromises.unlink(diskPath);
              } catch (unlinkErr) {
                if (unlinkErr?.code !== 'ENOENT') {
                  fileLogger.warn('上传失败，清理文件出错', {
                    error: unlinkErr.message,
                  });
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

  // 列表（带 Joi 查询参数验证）
  router.get('/', validateQuery(listFilesSchema), async (req, res, next) => {
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

  // 详情（带 id 校验）
  router.get('/:id', validateId('id'), async (req, res, next) => {
    try {
      const row = service.get(req.params.id);
      res.json({ code: 200, success: true, data: row, message: '获取成功' });
    } catch (error) {
      next(error);
    }
  });

  // 下载（带 id 校验）
  router.get('/:id/download', validateId('id'), async (req, res, next) => {
    try {
      const row = service.get(req.params.id);
      // 将相对路径解析为磁盘路径
      const storedPath = row.file_path || row.filePath;
      if (!storedPath) {
        const err = new Error('文件路径缺失');
        err.status = 500;
        throw err;
      }

      const absolutePath = toUploadsAbsolutePath(storedPath);
      if (!absolutePath) {
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

  // 删除（带 id 校验）
  router.delete(
    '/:id',
    adminGuard,
    validateId('id'),
    async (req, res, next) => {
      try {
        await service.remove(req.params.id);
        res.json({ code: 200, success: true, message: '文件删除成功' });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

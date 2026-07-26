import express from 'express';
import fs from 'fs/promises';
import { FileService } from '../services/file.service.js';
import { parseEnvByteSize, parseEnvNumber } from '../utils/env.js';
import { detectTypeCategory, FILE_CATEGORIES } from '../utils/file-metadata.js';
import { normaliseUploadedFileName } from '../utils/upload.js';
import logger from '../utils/logger.js';
import { createUploader } from '../utils/uploader.js';
import { assertValidImageFile } from '../utils/magic-bytes.js';
import { DEFAULT_FILE_MAX_SIZE } from '../constants/limits.js';
import { validateQuery, validateId, listFilesSchema } from '../dto/file.dto.js';
import { FILES_DIR } from '../utils/upload-path.js';
import {
  buildFileListData,
  buildUploadPayloads,
  cleanupUploadedPayloadFiles,
  resolveDownloadAbsolutePath,
  resolveRequestBaseUrl,
  toCreatedFileResponse,
} from '../utils/file-route.js';

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
// 注：uploads/files 目录由 createUploadDirs() 在应用启动时统一创建，此处无需重复创建。

function isAllowedFile(file) {
  if (process.env.FILE_ALLOW_ALL_TYPES !== 'false') return true;
  const category = detectTypeCategory(file.mimetype, file.originalname);
  return category !== FILE_CATEGORIES.OTHER;
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

async function validateImageFiles(files) {
  // 对声明为图片的文件做 magic bytes 校验，防止伪造 MIME 上传可执行内容。
  // 非图片文件不校验（如文档、压缩包等），与图标/壁纸/留言板图片的严格策略保持一致。
  const imageFiles = files.filter(f => f.mimetype?.startsWith('image/'));
  for (const file of imageFiles) {
    await assertValidImageFile(file.path, file.mimetype);
  }
}

async function cleanupFiles(files) {
  await Promise.allSettled(
    files.map(f =>
      fs.unlink(f.path).catch(err => {
        if (err.code !== 'ENOENT') {
          fileLogger.warn('清理上传文件出错', {
            filename: f.filename,
            error: err.message,
          });
        }
      })
    )
  );
}

export function createFileRoutes(db) {
  const router = express.Router();
  const service = new FileService(db);

  // 上传（支持多文件）
  router.post(
    '/upload',
    upload.array('file', MAX_UPLOAD_FILES),
    async (req, res, next) => {
      try {
        const baseUrl = resolveRequestBaseUrl(req);
        const files = req.files || [];
        if (!files.length)
          return res
            .status(400)
            .json({ code: 400, success: false, message: '请选择文件' });

        // 图片类文件做 magic bytes 校验，失败时清理所有已落盘文件
        try {
          await validateImageFiles(files);
        } catch (validationErr) {
          await cleanupFiles(files);
          return next(validationErr);
        }

        const payloads = buildUploadPayloads(files, baseUrl);

        let results;
        try {
          results = service.createMany(payloads);
        } catch (createErr) {
          await cleanupUploadedPayloadFiles(payloads, cleanupError =>
            fileLogger.warn('上传失败，清理文件出错', {
              error: cleanupError.message,
            })
          );
          throw createErr;
        }

        const data = toCreatedFileResponse(results);
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
        data: buildFileListData(result),
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
      const absolutePath = await resolveDownloadAbsolutePath(row);

      res.setHeader(
        'Content-Type',
        row.mime_type || 'application/octet-stream'
      );
      res.download(absolutePath, row.original_name);
    } catch (error) {
      next(error);
    }
  });

  // 删除（带 id 校验）
  router.delete('/:id', validateId('id'), async (req, res, next) => {
    try {
      await service.remove(req.params.id);
      res.json({ code: 200, success: true, message: '文件删除成功' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

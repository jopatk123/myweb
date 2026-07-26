/**
 * 文件管理控制器
 *
 * 从 routes/files.routes.js 拆分而来，负责文件上传/列表/详情/下载/删除的业务编排。
 * routes 层仅负责挂载路由，与项目其他模块（wallpaper.controller / message.controller 等）分层保持一致。
 */
import express from 'express';
import fs from 'fs/promises';
import { FileService } from '../services/file.service.js';
import { parseEnvByteSize, parseEnvNumber } from '../utils/env.js';
import { normaliseUploadedFileName } from '../utils/upload.js';
import logger from '../utils/logger.js';
import { createUploader } from '../utils/uploader.js';
import { assertValidUploadedFile } from '../utils/magic-bytes.js';
import { DEFAULT_FILE_MAX_SIZE } from '../constants/limits.js';
import { validateQuery, validateId, listFilesSchema } from '../dto/file.dto.js';
import { FILES_DIR } from '../utils/upload-path.js';
import {
  BLOCKED_EXECUTABLE_EXTENSIONS,
  BLOCKED_EXECUTABLE_MIME_TYPES,
} from '../../../shared/fileTypes.js';
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

/**
 * 是否启用类型白名单防护
 *
 * 语义反转（与历史版本兼容性说明）：
 * - 旧：FILE_ALLOW_ALL_TYPES !== 'false' 默认 true（允许所有类型，无防护）
 * - 新：FILE_ALLOW_ALL_TYPES === 'true' 时才关闭防护，默认启用白名单
 *
 * 启用防护时：
 *   1. 拒绝 BLOCKED_EXECUTABLE_EXTENSIONS / BLOCKED_EXECUTABLE_MIME_TYPES 中的类型
 *   2. 对图片/压缩包/PDF 做 magic bytes 校验
 */
function isTypeProtectionEnabled() {
  return process.env.FILE_ALLOW_ALL_TYPES !== 'true';
}

/**
 * 判断单个上传文件是否被白名单防护拒绝
 * @returns {boolean} true 表示拒绝
 */
function isBlockedByWhitelist(file) {
  const mime = String(file?.mimetype || '').toLowerCase();
  if (mime && BLOCKED_EXECUTABLE_MIME_TYPES.has(mime)) {
    return true;
  }

  const originalName = String(file?.originalname || '');
  const lastDot = originalName.lastIndexOf('.');
  if (lastDot !== -1) {
    const ext = originalName.slice(lastDot).toLowerCase();
    if (BLOCKED_EXECUTABLE_EXTENSIONS.has(ext)) {
      return true;
    }
  }

  return false;
}

/**
 * multer fileFilter：规范化文件名 + 白名单拦截
 */
const fileFilter = (_req, file, cb) => {
  normaliseUploadedFileName(file);

  if (isTypeProtectionEnabled() && isBlockedByWhitelist(file)) {
    const err = new Error('不支持的文件类型');
    err.status = 400;
    err.code = 'UNSUPPORTED_FILE_TYPE';
    err.field = file.fieldname;
    return cb(err);
  }

  return cb(null, true);
};

const upload = createUploader({
  destination: FILES_DIR,
  maxFileSize: MAX_UPLOAD_SIZE,
  fileFilter,
});

/**
 * 对上传文件做 magic bytes 校验
 *
 * 校验策略：
 * - 启用白名单防护时，对所有声明为图片/压缩包/PDF 的文件校验 magic bytes
 * - 防止伪造 Content-Type 上传可执行内容
 */
async function validateUploadedFiles(files) {
  if (!isTypeProtectionEnabled()) return;

  for (const file of files) {
    await assertValidUploadedFile(file.path, file.mimetype, file.originalname);
  }
}

/**
 * 清理已落盘的上传文件（用于错误回滚）
 */
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

/**
 * 创建文件路由并注入 db
 */
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

        // magic bytes 校验，失败时清理所有已落盘文件
        try {
          await validateUploadedFiles(files);
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
      // res.download 会自动设置 Content-Disposition: attachment，
      // 浏览器会强制下载而非内联渲染，防止 HTML/SVG 等可执行内容执行脚本
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

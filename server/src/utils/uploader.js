/**
 * Multer 上传中间件工厂
 * 统一封装 diskStorage + fileFilter 逻辑，消除各控制器中的重复配置。
 */
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { normaliseUploadedFileName } from './upload.js';

/**
 * 创建 multer 上传中间件实例
 *
 * @param {object} options
 * @param {string}   options.destination   - 上传文件保存的绝对目录路径
 * @param {number}   options.maxFileSize   - 单文件最大字节数
 * @param {number}   [options.maxFiles]    - 单次请求最多文件数（可选）
 * @param {string}   [options.defaultExt=''] - 原始文件无扩展名时使用的默认后缀
 * @param {Function} [options.fileFilter]  - 自定义 multer fileFilter 回调
 * @returns {import('multer').Multer}
 */
export function createUploader({
  destination,
  maxFileSize,
  maxFiles,
  defaultExt = '',
  fileFilter,
}) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || defaultExt;
      cb(null, `${uuidv4()}${ext}`);
    },
  });

  const limits = { fileSize: maxFileSize };
  if (maxFiles !== undefined) limits.files = maxFiles;

  return multer({ storage, limits, fileFilter });
}

/**
 * 仅接受图片文件（适用于壁纸上传）
 * 不修改 file.originalname。
 */
export function imageOnlyFilter(_req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只支持图片文件'), false);
  }
}

/**
 * 仅接受图片文件，同时规范化文件名编码（适用于留言板图片上传）
 */
export function imageUploadFilter(_req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    normaliseUploadedFileName(file);
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
}

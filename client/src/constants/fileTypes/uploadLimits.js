/**
 * 上传文件大小限制（字节）
 * DEFAULT 与后端共用 shared/constants.js#FILE_UPLOAD_MAX_SIZE 单一真相源
 */
import { FILE_UPLOAD_MAX_SIZE } from '@shared/constants.js';

export const UPLOAD_SIZE_LIMITS = {
  DEFAULT: FILE_UPLOAD_MAX_SIZE,
  IMAGE: 50 * 1024 * 1024, // 50MB
  VIDEO: 2 * 1024 * 1024 * 1024, // 2GB
  AUDIO: 200 * 1024 * 1024, // 200MB
  DOCUMENT: 100 * 1024 * 1024, // 100MB
};

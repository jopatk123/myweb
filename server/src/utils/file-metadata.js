import path from 'path';
import {
  FILE_CATEGORIES,
  MIME_TYPE_MAP,
  EXTENSION_TYPE_MAP,
} from '../../../shared/fileTypes.js';

// 重新导出 shared 中的常量，便于现有调用方保持导入路径不变
export { FILE_CATEGORIES, MIME_TYPE_MAP, EXTENSION_TYPE_MAP };

/**
 * 根据_mime 类型与文件名推断文件类型分类
 * @param {string} mimeType
 * @param {string} [originalName]
 * @returns {string} FILE_CATEGORIES 中的某个值
 */
export function detectTypeCategory(mimeType, originalName = '') {
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  if (MIME_TYPE_MAP[normalizedMimeType]) {
    return MIME_TYPE_MAP[normalizedMimeType];
  }

  if (normalizedMimeType.startsWith('image/')) return FILE_CATEGORIES.IMAGE;
  if (normalizedMimeType.startsWith('video/')) return FILE_CATEGORIES.VIDEO;
  if (normalizedMimeType.startsWith('audio/')) return FILE_CATEGORIES.AUDIO;
  if (normalizedMimeType.startsWith('text/')) return FILE_CATEGORIES.TEXT;

  if (originalName) {
    const name = String(originalName).toLowerCase();
    const lastDotIndex = name.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      const extension = name.substring(lastDotIndex);
      if (EXTENSION_TYPE_MAP[extension]) {
        return EXTENSION_TYPE_MAP[extension];
      }
    }
  }

  return FILE_CATEGORIES.OTHER;
}

export function buildFileUrl(baseUrl, relativePath) {
  const normalizedPath = relativePath.replace(/^\/+/, '');
  const trimmedBase = (baseUrl || '').trim();
  if (!trimmedBase) {
    return normalizedPath;
  }

  const sanitizedBase = trimmedBase.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(sanitizedBase)) {
    try {
      const base = sanitizedBase.endsWith('/')
        ? sanitizedBase
        : `${sanitizedBase}/`;
      return new URL(normalizedPath, base).toString();
    } catch {
      return `${sanitizedBase}/${normalizedPath}`;
    }
  }

  return `${sanitizedBase}/${normalizedPath}`;
}

export function normalizeStoredPath(filePath) {
  return path.posix
    .normalize(String(filePath || '').replace(/\\/g, '/'))
    .replace(/^\/+/, '');
}

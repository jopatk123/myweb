import { FILE_CATEGORIES } from '@/constants/fileTypes/categories.js';
import { MIME_TYPE_MAP } from '@/constants/fileTypes/mimeMap.js';
import { EXTENSION_TYPE_MAP } from '@/constants/fileTypes/extensionMap.js';
import {
  FILE_TYPE_ICONS,
  PREVIEWABLE_CATEGORIES,
} from '@/constants/fileTypes/icons.js';

/**
 * 根据 MIME 类型和文件名获取文件类型分类
 */
export function getFileCategory(mimeType, fileName = '') {
  if (mimeType && MIME_TYPE_MAP[mimeType.toLowerCase()]) {
    return MIME_TYPE_MAP[mimeType.toLowerCase()];
  }

  const mt = String(mimeType || '').toLowerCase();
  if (mt.startsWith('image/')) return FILE_CATEGORIES.IMAGE;
  if (mt.startsWith('video/')) return FILE_CATEGORIES.VIDEO;
  if (mt.startsWith('audio/')) return FILE_CATEGORIES.AUDIO;
  if (mt.startsWith('text/')) return FILE_CATEGORIES.TEXT;

  if (fileName) {
    const name = String(fileName).toLowerCase();
    const lastDotIndex = name.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      const ext = name.substring(lastDotIndex);
      if (EXTENSION_TYPE_MAP[ext]) {
        return EXTENSION_TYPE_MAP[ext];
      }
    }
  }

  return FILE_CATEGORIES.OTHER;
}

export function getFileIcon(category) {
  return FILE_TYPE_ICONS[category] || FILE_TYPE_ICONS[FILE_CATEGORIES.OTHER];
}

export function getFileIconByFile(mimeType, fileName) {
  return getFileIcon(getFileCategory(mimeType, fileName));
}

export function isPreviewable(category) {
  return PREVIEWABLE_CATEGORIES.includes(category);
}

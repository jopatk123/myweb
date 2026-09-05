import fs from 'fs/promises';
import path from 'path';
import { ValidationError } from './errors.js';

/** 仅允许落在 icons 目录内的安全文件名（含历史非 UUID 名） */
export const ICON_FILENAME_PATTERN =
  /^[A-Za-z0-9._-]+\.(png|jpe?g|webp|gif|svg|ico|bmp|tiff?|avif|heic)$/i;

export const FORMAT_TO_EXTENSION = {
  jpeg: '.jpg',
  jpg: '.jpg',
  png: '.png',
  webp: '.webp',
  gif: '.gif',
  svg: '.svg',
  bmp: '.bmp',
  tiff: '.tiff',
  tif: '.tiff',
  ico: '.ico',
  avif: '.avif',
  heif: '.heic',
  heic: '.heic',
};

export const MIME_TO_FORMAT = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/avif': 'avif',
  'image/heic': 'heif',
  'image/heif': 'heif',
};

export function extensionForFormat(format) {
  if (!format) return null;
  return FORMAT_TO_EXTENSION[String(format).toLowerCase()] || null;
}

export function formatFromMime(mime) {
  if (!mime) return null;
  return MIME_TO_FORMAT[String(mime).toLowerCase()] || null;
}

export function sanitizeIconFilename(filename) {
  const raw = String(filename || '').trim();
  const safe = path.basename(raw);
  if (!safe || safe !== raw || !ICON_FILENAME_PATTERN.test(safe)) {
    throw new ValidationError('图标文件名不合法');
  }
  return safe;
}

export function resolveIconFilePath(uploadsDir, filename) {
  const safe = sanitizeIconFilename(filename);
  const root = path.resolve(uploadsDir);
  const resolved = path.resolve(root, safe);
  const relative = path.relative(root, resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ValidationError('图标文件名不合法');
  }
  return { filename: safe, filePath: resolved };
}

export async function assertIconFileOnDisk(uploadsDir, filename) {
  const resolved = resolveIconFilePath(uploadsDir, filename);
  try {
    await fs.access(resolved.filePath);
  } catch {
    throw new ValidationError('图标文件不存在或不可用');
  }
  return resolved;
}

/**
 * 将图标文件重命名为与内容格式一致的扩展名。
 * @returns {Promise<string>} 最终文件名
 */
export async function renameIconToMatchFormat(
  filePath,
  filename,
  outputFormat
) {
  const desiredExt = extensionForFormat(outputFormat);
  if (!desiredExt) return filename;

  const currentExt = path.extname(filename);
  if (currentExt.toLowerCase() === desiredExt) {
    return filename;
  }

  const newFilename = `${path.basename(filename, currentExt)}${desiredExt}`;
  const newPath = path.join(path.dirname(filePath), newFilename);
  await fs.rename(filePath, newPath);
  return newFilename;
}

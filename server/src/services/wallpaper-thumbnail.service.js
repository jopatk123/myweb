import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import logger from '../utils/logger.js';
import {
  WALLPAPER_THUMBNAILS_DIR,
  toUploadsAbsolutePath,
  toUploadsRelativePath,
} from '../utils/upload-path.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const thumbnailLogger = logger.child('WallpaperThumbnail');

export const THUMBNAIL_DEFAULT_WIDTH = 320;
const THUMBNAIL_MIN_SIZE = 50;
const THUMBNAIL_MAX_SIZE = 3840;
const SUPPORTED_THUMBNAIL_FORMATS = new Set([
  'webp',
  'jpeg',
  'jpg',
  'png',
  'avif',
]);

const THUMBNAIL_DIR = WALLPAPER_THUMBNAILS_DIR;

function sanitizeDimension(value, allowNull = false) {
  if (value === undefined || value === null || value === '') {
    return allowNull ? null : THUMBNAIL_DEFAULT_WIDTH;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return allowNull ? null : THUMBNAIL_DEFAULT_WIDTH;
  }
  return Math.max(
    THUMBNAIL_MIN_SIZE,
    Math.min(THUMBNAIL_MAX_SIZE, Math.round(numeric))
  );
}

function sanitizeFormat(value) {
  if (!value) return 'webp';
  const normalized = String(value).toLowerCase();
  if (!SUPPORTED_THUMBNAIL_FORMATS.has(normalized)) return 'webp';
  return normalized;
}

/**
 * 生成单张缩略图并写入缓存目录。
 * 失败时清理残留文件，避免下次请求读取到不完整缓存。
 */
async function generateThumbnailToFile(
  originalPath,
  cachedPath,
  width,
  height,
  format,
  originalMtime
) {
  await fs.mkdir(THUMBNAIL_DIR, { recursive: true });

  const pipeline = sharp(originalPath).rotate();

  if (width || height) {
    pipeline.resize({
      width: width || null,
      height: height || null,
      fit: height ? 'cover' : 'inside',
      withoutEnlargement: true,
    });
  }

  switch (format) {
    case 'jpeg':
      pipeline.jpeg({ quality: 75, mozjpeg: true });
      break;
    case 'png':
      pipeline.png({ compressionLevel: 8, adaptiveFiltering: true });
      break;
    case 'avif':
      pipeline.avif({ quality: 45 });
      break;
    default:
      pipeline.webp({ quality: 70, smartSubsample: true });
  }

  try {
    await pipeline.toFile(cachedPath);
    await fs.utimes(cachedPath, originalMtime, originalMtime);
  } catch (err) {
    try {
      await fs.unlink(cachedPath);
    } catch {
      // 不完整文件可能未写入磁盘，忽略
    }
    throw err;
  }
}

/**
 * 壁纸缩略图管理器：负责按需生成/缓存/失效清理。
 * 持有并发生成锁，避免对同一缓存文件的并发写入。
 */
export class WallpaperThumbnailManager {
  /** cachedPath -> Promise<void> */
  #generationLocks = new Map();

  constructor(wallpaperModel) {
    this.wallpaperModel = wallpaperModel;
  }

  async getThumbnail(wallpaper, options = {}) {
    const { width: rawWidth, height: rawHeight, format: rawFormat } = options;

    let originalPath = wallpaper.file_path;
    if (!originalPath) throw new NotFoundError('壁纸文件路径不存在');

    originalPath = toUploadsAbsolutePath(originalPath);
    if (!originalPath) throw new ValidationError('壁纸文件路径无效');

    let stats;
    try {
      stats = await fs.stat(originalPath);
    } catch {
      throw new NotFoundError('壁纸原始文件不存在');
    }

    const sanitizedWidth = sanitizeDimension(rawWidth);
    const sanitizedHeight = sanitizeDimension(rawHeight, true);
    const normalizedFormat = sanitizeFormat(rawFormat);
    const outputExtension =
      normalizedFormat === 'jpg' ? 'jpeg' : normalizedFormat;

    const parsed = path.parse(originalPath);
    const suffix = `${sanitizedWidth || 'auto'}x${sanitizedHeight || 'auto'}.${outputExtension}`;
    const cachedFilename = `${wallpaper.id}-${parsed.name}-${suffix}`;
    const cachedPath = path.join(THUMBNAIL_DIR, cachedFilename);
    const cachedRelativePath = toUploadsRelativePath(
      'wallpapers',
      'thumbnails',
      cachedFilename
    );

    let regenerate = true;
    try {
      const cacheStats = await fs.stat(cachedPath);
      regenerate = cacheStats.mtimeMs < stats.mtimeMs;
    } catch {
      regenerate = true;
    }

    // 仅由"实际执行生成"的请求记录缓存路径，
    // 命中缓存或等待并发锁的请求无需重复写 DB。
    let freshlyGenerated = false;
    if (regenerate) {
      if (this.#generationLocks.has(cachedPath)) {
        await this.#generationLocks.get(cachedPath);
      } else {
        freshlyGenerated = true;
        const task = generateThumbnailToFile(
          originalPath,
          cachedPath,
          sanitizedWidth,
          sanitizedHeight,
          outputExtension,
          stats.mtime
        );
        this.#generationLocks.set(cachedPath, task);
        try {
          await task;
        } finally {
          this.#generationLocks.delete(cachedPath);
        }
      }
    }

    const thumbStats = await fs.stat(cachedPath);
    if (freshlyGenerated) {
      this.wallpaperModel.trackThumbnailCache(wallpaper.id, cachedRelativePath);
    }
    const etag = `W/"${thumbStats.size}-${Math.round(thumbStats.mtimeMs)}"`;

    return {
      filePath: cachedPath,
      mimeType: `image/${outputExtension}`,
      etag,
      lastModified: thumbStats.mtime.toUTCString(),
      size: thumbStats.size,
    };
  }

  async purgeCache(wallpaperId) {
    if (!wallpaperId) return;

    const targets = this.wallpaperModel.listThumbnailCachePaths(wallpaperId);
    if (targets.length === 0) return;

    await Promise.allSettled(
      targets.map(async cachePath => {
        const targetPath = toUploadsAbsolutePath(cachePath);
        if (!targetPath) return;
        try {
          await fs.unlink(targetPath);
        } catch (error) {
          if (error?.code !== 'ENOENT') {
            thumbnailLogger.warn('删除缩略图缓存失败（已忽略）', {
              path: targetPath,
              error: error?.message || error,
            });
          }
        }
      })
    );

    this.wallpaperModel.clearThumbnailCacheRecords(wallpaperId);
  }
}

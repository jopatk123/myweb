import { WallpaperModel } from '../models/wallpaper.model.js';
import { WallpaperGroupModel } from '../models/wallpaper-group.model.js';
import { mapToSnake } from '../utils/field-mapper.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const THUMBNAIL_DEFAULT_WIDTH = 320;
const THUMBNAIL_MIN_SIZE = 50;
const THUMBNAIL_MAX_SIZE = 3840;
const SUPPORTED_THUMBNAIL_FORMATS = new Set([
  'webp',
  'jpeg',
  'jpg',
  'png',
  'avif',
]);

// ESM 下没有 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const THUMBNAIL_DIR = path.join(
  __dirname,
  '../../uploads/wallpapers/thumbnails'
);

export class WallpaperService {
  constructor(db) {
    this.wallpaperModel = new WallpaperModel(db);
    this.groupModel = new WallpaperGroupModel(db);
  }

  /**
   * 支持分页：如果传入 page 和 limit，则返回 { items, total }
   * 否则返回数组（向后兼容）
   */
  getAllWallpapers(groupId = null, page = null, limit = null) {
    return this.wallpaperModel.findAll(groupId, false, page, limit);
  }

  getWallpaperById(id) {
    const wallpaper = this.wallpaperModel.findById(id);
    if (!wallpaper) {
      const err = new Error('壁纸不存在');
      err.status = 404;
      throw err;
    }
    return wallpaper;
  }

  getWallpapersByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return this.wallpaperModel.findManyByIds(ids);
  }

  async uploadWallpaper(fileData, groupId = null) {
    // 期望 controller 传入 camelCase 的 fileData；在此做一次必要的 fallback 兼容
    const filename = fileData.filename || fileData.file_name;
    const originalName =
      fileData.originalName || fileData.original_name || fileData.originalname;
    const filePath = fileData.filePath || fileData.file_path;
    const fileSize = fileData.fileSize || fileData.file_size || fileData.size;
    const mimeType =
      fileData.mimeType || fileData.mime_type || fileData.mimetype;
    const name = fileData.name || fileData.title || originalName;

    // 验证文件类型
    if (!mimeType || !mimeType.startsWith('image/')) {
      throw new Error('只支持图片文件');
    }

    // 如果未指定分组，使用默认分组
    if (!groupId) {
      const def = this.groupModel.getDefault();
      groupId = def?.id || null;
    }

    // 在 service 层统一把 camelCase 字段映射为 model/DB 层需要的 snake_case 字段
    const payload = {
      filename,
      originalName,
      filePath,
      fileSize,
      mimeType,
      groupId,
      name,
    };

    const dbPayload = mapToSnake(payload);
    try {
      return this.wallpaperModel.create(dbPayload);
    } catch (error) {
      // DB 插入失败时，尝试回滚删除已落盘文件，避免产生孤儿文件
      try {
        let diskPath = dbPayload.file_path;
        if (!path.isAbsolute(diskPath)) {
          diskPath = path.join(__dirname, '../../', diskPath);
        }
        await fs.unlink(diskPath);
      } catch (cleanupErr) {
        if (cleanupErr.code !== 'ENOENT') {
          console.warn(
            '壁纸上传失败后的文件清理失败:',
            cleanupErr && cleanupErr.message
          );
        }
      }
      throw error;
    }
  }

  async updateWallpaper(id, data) {
    const existing = this.getWallpaperById(id); // 验证壁纸存在
    const updated = this.wallpaperModel.update(id, data);

    const existingPath = existing?.file_path;
    const updatedPath = updated?.file_path;
    if (existingPath && updatedPath && existingPath !== updatedPath) {
      await this.#purgeThumbnailCache(existingPath);
    }

    return updated;
  }

  async deleteWallpaper(id) {
    const wallpaper = this.getWallpaperById(id);
    if (!wallpaper) return;

    // 先从数据库软删除，确保前端与 DB 状态一致
    const dbResult = this.wallpaperModel.delete(id);

    // 再尽力删除物理文件（失败不影响已完成的 DB 变更）
    try {
      let diskPath = wallpaper.file_path;
      if (!path.isAbsolute(diskPath)) {
        diskPath = path.join(__dirname, '../../', diskPath);
      }
      await fs.unlink(diskPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('删除壁纸物理文件失败（已忽略）:', error && error.message);
      }
    }

    await this.#purgeThumbnailCache(wallpaper.file_path);

    return dbResult;
  }

  async deleteMultipleWallpapers(ids) {
    const wallpapers = this.wallpaperModel.findManyByIds(ids);
    if (!wallpapers || wallpapers.length === 0) return;

    // 1. 先批量从数据库软删除
    const dbResult = this.wallpaperModel.deleteMany(ids);

    // 2. 再尽力批量删除物理文件（失败仅记录，不影响 DB 已生效的变更）
    for (const wallpaper of wallpapers) {
      try {
        let diskPath = wallpaper.file_path;
        if (!path.isAbsolute(diskPath)) {
          diskPath = path.join(__dirname, '../../', diskPath);
        }
        await fs.unlink(diskPath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.warn(
            `批量删除壁纸时文件删除失败（已忽略）: ${wallpaper.file_path}`,
            error && error.message
          );
        }
      }

      await this.#purgeThumbnailCache(wallpaper.file_path);
    }

    return dbResult;
  }

  async moveMultipleWallpapers(ids, groupId) {
    // 验证分组是否存在
    if (groupId) {
      this.getGroupById(groupId);
    }
    return this.wallpaperModel.moveMany(ids, groupId);
  }

  setActiveWallpaper(id) {
    this.getWallpaperById(id); // 验证壁纸存在
    return this.wallpaperModel.setActive(id);
  }

  getActiveWallpaper() {
    return this.wallpaperModel.getActive();
  }

  async getWallpaperThumbnail(id, options = {}) {
    const { width: rawWidth, height: rawHeight, format: rawFormat } = options;

    const wallpaper = this.getWallpaperById(id);
    let originalPath = wallpaper.file_path;
    if (!originalPath) {
      const err = new Error('壁纸文件路径不存在');
      err.status = 404;
      throw err;
    }

    if (!path.isAbsolute(originalPath)) {
      originalPath = path.join(__dirname, '../../', originalPath);
    }

    let stats;
    try {
      stats = await fs.stat(originalPath);
    } catch {
      const err = new Error('壁纸原始文件不存在');
      err.status = 404;
      throw err;
    }

    const sanitizedWidth = this.#sanitizeDimension(rawWidth);
    const sanitizedHeight = this.#sanitizeDimension(rawHeight, true);
    const normalizedFormat = this.#sanitizeFormat(rawFormat);
    const outputExtension =
      normalizedFormat === 'jpg' ? 'jpeg' : normalizedFormat;

    const parsed = path.parse(originalPath);
    const suffix = `${sanitizedWidth || 'auto'}x${sanitizedHeight || 'auto'}.${outputExtension}`;
    const cachedFilename = `${parsed.name}-${suffix}`;
    const cachedPath = path.join(THUMBNAIL_DIR, cachedFilename);

    let regenerate = true;
    try {
      const cacheStats = await fs.stat(cachedPath);
      regenerate = cacheStats.mtimeMs < stats.mtimeMs;
    } catch {
      regenerate = true;
    }

    if (regenerate) {
      await fs.mkdir(THUMBNAIL_DIR, { recursive: true });
      const pipeline = sharp(originalPath).rotate();

      if (sanitizedWidth || sanitizedHeight) {
        pipeline.resize({
          width: sanitizedWidth || null,
          height: sanitizedHeight || null,
          fit: sanitizedHeight ? 'cover' : 'inside',
          withoutEnlargement: true,
        });
      }

      switch (outputExtension) {
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

      await pipeline.toFile(cachedPath);
      // 将缩略图的 mtime 与原图保持一致，方便比较
      const timestamp = stats.mtime;
      await fs.utimes(cachedPath, timestamp, timestamp);
    }

    const thumbStats = await fs.stat(cachedPath);
    const etag = `W/"${thumbStats.size}-${Math.round(thumbStats.mtimeMs)}"`;

    return {
      filePath: cachedPath,
      mimeType: `image/${outputExtension}`,
      etag,
      lastModified: thumbStats.mtime.toUTCString(),
      size: thumbStats.size,
    };
  }

  getRandomWallpaper(groupId) {
    let resolvedGroupId = groupId;

    if (
      resolvedGroupId !== null &&
      resolvedGroupId !== undefined &&
      resolvedGroupId !== ''
    ) {
      const numeric = Number(resolvedGroupId);
      if (!Number.isNaN(numeric)) {
        resolvedGroupId = numeric;
      }
    } else {
      resolvedGroupId = null;
    }

    if (resolvedGroupId === null) {
      // 优先使用当前分组；若未设置，则退回默认分组
      const current = this.groupModel.getCurrent();
      const fallback = this.groupModel.getDefault();
      resolvedGroupId = current?.id || fallback?.id || null;
    }

    let wallpaper = this.wallpaperModel.getRandomByGroup(resolvedGroupId);

    if (!wallpaper && resolvedGroupId !== null) {
      // 指定分组无壁纸时退回到全局集合
      wallpaper = this.wallpaperModel.getRandomByGroup(null);
    }

    if (wallpaper) {
      this.wallpaperModel.setActive(wallpaper.id);
    }

    return wallpaper;
  }

  #sanitizeDimension(value, allowNull = false) {
    if (value === undefined || value === null || value === '') {
      return allowNull ? null : THUMBNAIL_DEFAULT_WIDTH;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return allowNull ? null : THUMBNAIL_DEFAULT_WIDTH;
    }
    const clamped = Math.max(
      THUMBNAIL_MIN_SIZE,
      Math.min(THUMBNAIL_MAX_SIZE, Math.round(numeric))
    );
    return clamped;
  }

  #sanitizeFormat(value) {
    if (!value) return 'webp';
    const normalized = String(value).toLowerCase();
    if (!SUPPORTED_THUMBNAIL_FORMATS.has(normalized)) {
      return 'webp';
    }
    if (normalized === 'jpg') return 'jpg';
    return normalized;
  }

  async #purgeThumbnailCache(filePath) {
    if (!filePath) return;

    const parsed = path.parse(filePath);
    const baseName = parsed.name;
    if (!baseName) return;

    let entries;
    try {
      entries = await fs.readdir(THUMBNAIL_DIR);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        console.warn(
          '读取缩略图缓存目录失败（已忽略）:',
          error?.message || error
        );
      }
      return;
    }

    if (!entries || entries.length === 0) return;

    const prefix = `${baseName}-`;
    const targets = entries.filter(name => name.startsWith(prefix));
    if (targets.length === 0) return;

    await Promise.allSettled(
      targets.map(async name => {
        const targetPath = path.join(THUMBNAIL_DIR, name);
        try {
          await fs.unlink(targetPath);
        } catch (error) {
          if (error?.code !== 'ENOENT') {
            console.warn(
              '删除缩略图缓存失败（已忽略）:',
              targetPath,
              error?.message || error
            );
          }
        }
      })
    );
  }

  // 分组相关方法
  getAllGroups() {
    return this.groupModel.findAll();
  }

  getGroupById(id) {
    const group = this.groupModel.findById(id);
    if (!group) {
      const err = new Error('分组不存在');
      err.status = 404;
      throw err;
    }
    return group;
  }

  createGroup(data) {
    return this.groupModel.create(data);
  }

  updateGroup(id, data) {
    this.getGroupById(id); // 验证分组存在
    return this.groupModel.update(id, data);
  }

  deleteGroup(id) {
    this.getGroupById(id); // 验证分组存在

    // 检查分组下是否有壁纸
    const wallpapers = this.wallpaperModel.findAll(id);
    if (wallpapers.length > 0) {
      throw new Error('分组下还有壁纸，无法删除');
    }

    return this.groupModel.delete(id);
  }

  // 当前分组相关
  getCurrentGroup() {
    return this.groupModel.getCurrent() || this.groupModel.getDefault();
  }

  setCurrentGroup(id) {
    // 不允许将已删除或不存在的分组设为当前
    this.getGroupById(id);
    return this.groupModel.setCurrent(id);
  }
}

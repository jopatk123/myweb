import { WallpaperModel } from '../models/wallpaper.model.js';
import { WallpaperGroupModel } from '../models/wallpaper-group.model.js';
import { mapToSnake } from '../utils/field-mapper.js';
import fs from 'fs/promises';
import logger from '../utils/logger.js';
import { toUploadsAbsolutePath } from '../utils/upload-path.js';
import { assertValidImageFile } from '../utils/magic-bytes.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/errors.js';
import { WallpaperThumbnailManager } from './wallpaper-thumbnail.service.js';

const wallpaperLogger = logger.child('WallpaperService');

function normalizeWallpaperUploadPayload(fileData = {}) {
  return {
    filename: fileData.filename || fileData.file_name,
    originalName:
      fileData.originalName || fileData.original_name || fileData.originalname,
    filePath: fileData.filePath || fileData.file_path,
    fileSize: fileData.fileSize || fileData.file_size || fileData.size,
    mimeType: fileData.mimeType || fileData.mime_type || fileData.mimetype,
    name:
      fileData.name ||
      fileData.title ||
      fileData.originalName ||
      fileData.original_name ||
      fileData.originalname,
  };
}

export class WallpaperService {
  constructor(db) {
    this.wallpaperModel = new WallpaperModel(db);
    this.groupModel = new WallpaperGroupModel(db);
    this.thumbnails = new WallpaperThumbnailManager(this.wallpaperModel);
  }

  /**
   * 支持分页：如果传入 page 和 limit，则返回 { items, total }
   * 否则返回数组（向后兼容）
   */
  getAllWallpapers(groupId = null, page = null, limit = null) {
    return this.wallpaperModel.findAll({ groupId, page, limit });
  }

  getWallpaperById(id) {
    const wallpaper = this.wallpaperModel.findById(id);
    if (!wallpaper) throw new NotFoundError('壁纸不存在');
    return wallpaper;
  }

  getWallpapersByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return this.wallpaperModel.findManyByIds(ids);
  }

  async uploadWallpaper(fileData, groupId = null) {
    const { filename, originalName, filePath, fileSize, mimeType, name } =
      normalizeWallpaperUploadPayload(fileData);

    // 验证文件类型（一级：MIME 类型头检查）
    if (!mimeType || !mimeType.startsWith('image/')) {
      throw new ValidationError('只支持图片文件');
    }

    // 验证文件内容（二级：魔数验证，防止 MIME 欺骗攻击）
    if (filePath) {
      const diskPath = toUploadsAbsolutePath(filePath);
      if (diskPath) {
        await assertValidImageFile(diskPath, mimeType);
      }
    }

    if (!groupId) {
      const def = this.groupModel.getDefault();
      groupId = def?.id || null;
    }

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
        const diskPath = toUploadsAbsolutePath(dbPayload.file_path);
        if (diskPath) {
          await fs.unlink(diskPath);
        }
      } catch (cleanupErr) {
        if (cleanupErr.code !== 'ENOENT') {
          wallpaperLogger.warn('壁纸上传失败后的文件清理失败', {
            error: cleanupErr && cleanupErr.message,
          });
        }
      }
      throw error;
    }
  }

  async updateWallpaper(id, data) {
    const existing = this.getWallpaperById(id);
    const updated = this.wallpaperModel.update(id, mapToSnake(data));

    const existingPath = existing?.file_path;
    const updatedPath = updated?.file_path;
    if (existingPath && updatedPath && existingPath !== updatedPath) {
      await this.thumbnails.purgeCache(existing.id);
    }

    return updated;
  }

  async deleteWallpaper(id) {
    const wallpaper = this.getWallpaperById(id);
    if (!wallpaper) return;

    this.wallpaperModel.clearActiveIfMatches(id);
    const dbResult = this.wallpaperModel.delete(id);

    try {
      const diskPath = toUploadsAbsolutePath(wallpaper.file_path);
      if (!diskPath) {
        wallpaperLogger.warn('跳过删除非法壁纸路径', {
          path: wallpaper.file_path,
        });
      } else {
        await fs.unlink(diskPath);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        wallpaperLogger.warn('删除壁纸物理文件失败（已忽略）', {
          error: error && error.message,
        });
      }
    }

    await this.thumbnails.purgeCache(wallpaper.id);
    return dbResult;
  }

  async deleteMultipleWallpapers(ids) {
    const wallpapers = this.wallpaperModel.findManyByIds(ids);
    if (!wallpapers || wallpapers.length === 0) return;

    const activeWallpaperId = this.wallpaperModel.getActiveId();
    if (
      activeWallpaperId &&
      wallpapers.some(
        wallpaper => Number(wallpaper.id) === Number(activeWallpaperId)
      )
    ) {
      this.wallpaperModel.clearActiveIfMatches(activeWallpaperId);
    }

    const dbResult = this.wallpaperModel.deleteMany(ids);

    for (const wallpaper of wallpapers) {
      try {
        const diskPath = toUploadsAbsolutePath(wallpaper.file_path);
        if (!diskPath) {
          wallpaperLogger.warn('跳过删除非法壁纸路径', {
            path: wallpaper.file_path,
          });
        } else {
          await fs.unlink(diskPath);
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          wallpaperLogger.warn(
            `批量删除壁纸时文件删除失败（已忽略）: ${wallpaper.file_path}`,
            { error: error && error.message }
          );
        }
      }

      await this.thumbnails.purgeCache(wallpaper.id);
    }

    return dbResult;
  }

  async moveMultipleWallpapers(ids, groupId) {
    if (groupId) {
      this.getGroupById(groupId);
    }
    return this.wallpaperModel.moveMany(ids, groupId);
  }

  setActiveWallpaper(id) {
    this.getWallpaperById(id);
    return this.wallpaperModel.setActive(id);
  }

  getActiveWallpaper() {
    return this.wallpaperModel.getActive();
  }

  getWallpaperThumbnail(id, options = {}) {
    const wallpaper = this.getWallpaperById(id);
    return this.thumbnails.getThumbnail(wallpaper, options);
  }

  getRandomWallpaper(groupId) {
    let resolvedGroupId = groupId;

    if (
      resolvedGroupId !== null &&
      resolvedGroupId !== undefined &&
      resolvedGroupId !== ''
    ) {
      const numeric = Number(resolvedGroupId);
      if (!Number.isNaN(numeric)) resolvedGroupId = numeric;
    } else {
      resolvedGroupId = null;
    }

    if (resolvedGroupId === null) {
      const current = this.groupModel.getCurrent();
      const fallback = this.groupModel.getDefault();
      resolvedGroupId = current?.id || fallback?.id || null;
    }

    let wallpaper = this.wallpaperModel.getRandomByGroup(resolvedGroupId);

    if (!wallpaper && resolvedGroupId !== null) {
      wallpaper = this.wallpaperModel.getRandomByGroup(null);
    }

    if (wallpaper) {
      this.wallpaperModel.setActive(wallpaper.id);
    }

    return wallpaper;
  }

  // 分组相关方法
  getAllGroups() {
    return this.groupModel.findAll();
  }

  getGroupById(id) {
    const group = this.groupModel.findById(id);
    if (!group) {
      throw new NotFoundError('分组不存在');
    }
    return group;
  }

  createGroup(data) {
    return this.groupModel.create(data);
  }

  updateGroup(id, data) {
    this.getGroupById(id);
    return this.groupModel.update(id, data);
  }

  deleteGroup(id) {
    this.getGroupById(id);
    const wallpapers = this.wallpaperModel.findAll({ groupId: id });
    if (wallpapers.length > 0) {
      throw new ConflictError('分组下还有壁纸，无法删除');
    }
    return this.groupModel.delete(id);
  }

  getCurrentGroup() {
    return this.groupModel.getCurrent() || this.groupModel.getDefault();
  }

  setCurrentGroup(id) {
    this.getGroupById(id);
    return this.groupModel.setCurrent(id);
  }
}

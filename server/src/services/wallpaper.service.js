import { WallpaperModel } from '../models/wallpaper.model.js';
import { WallpaperGroupModel } from '../models/wallpaper-group.model.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM 下没有 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  async uploadWallpaper(fileData, groupId = null) {
    // 兼容 camelCase 与 snake_case 的字段名
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

    return this.wallpaperModel.create({
      filename,
      originalName,
      filePath,
      fileSize,
      mimeType,
      groupId,
      name,
    });
  }

  updateWallpaper(id, data) {
    this.getWallpaperById(id); // 验证壁纸存在
    return this.wallpaperModel.update(id, data);
  }

  async deleteWallpaper(id) {
    const wallpaper = this.getWallpaperById(id);
    if (!wallpaper) return; // 壁纸不存在或已被删除

    // 先删除物理文件
    try {
      // wallpaper.file_path 在数据库中可能是两种形式:
      // 1) 旧记录存储的是磁盘绝对路径 (例如 /home/.../uploads/...)，
      // 2) 新记录我们存储为 web 相对路径 (例如 uploads/wallpapers/xxx.jpg)
      let diskPath = wallpaper.file_path;
      if (!path.isAbsolute(diskPath)) {
        // 从项目根解析到文件系统路径
        diskPath = path.join(__dirname, '../../', diskPath);
      }
      await fs.unlink(diskPath);
    } catch (error) {
      // 如果文件不存在，可以忽略错误，否则向上抛出
      if (error.code !== 'ENOENT') {
        console.error('删除物理文件失败:', error);
        throw new Error('删除物理文件失败');
      }
    }

    // 再从数据库删除
    return this.wallpaperModel.delete(id);
  }

  async deleteMultipleWallpapers(ids) {
    const wallpapers = this.wallpaperModel.findManyByIds(ids);
    if (!wallpapers || wallpapers.length === 0) return;

    // 1. 批量删除物理文件
    for (const wallpaper of wallpapers) {
      try {
        let diskPath = wallpaper.file_path;
        if (!path.isAbsolute(diskPath)) {
          diskPath = path.join(__dirname, '../../', diskPath);
        }
        await fs.unlink(diskPath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`删除文件 ${wallpaper.file_path} 失败:`, error);
          // 选择性地决定是否因为单个文件删除失败而中断整个过程
        }
      }
    }

    // 2. 批量从数据库删除
    return this.wallpaperModel.deleteMany(ids);
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

  getRandomWallpaper(groupId) {
    if (!groupId) {
      // 优先使用当前分组；若未设置，则退回默认分组
      const current = this.groupModel.getCurrent();
      const fallback = this.groupModel.getDefault();
      groupId = current?.id || fallback?.id || null;
    }

    const wallpaper = this.wallpaperModel.getRandomByGroup(groupId);
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

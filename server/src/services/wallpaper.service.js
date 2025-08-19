import { WallpaperModel } from '../models/wallpaper.model.js';
import { WallpaperGroupModel } from '../models/wallpaper-group.model.js';
import fs from 'fs/promises';
import path from 'path';

export class WallpaperService {
  constructor(db) {
    this.wallpaperModel = new WallpaperModel(db);
    this.groupModel = new WallpaperGroupModel(db);
  }

  getAllWallpapers(groupId = null) {
    return this.wallpaperModel.findAll(groupId);
  }

  getWallpaperById(id) {
    const wallpaper = this.wallpaperModel.findById(id);
    if (!wallpaper) {
      throw new Error('壁纸不存在');
    }
    return wallpaper;
  }

  async uploadWallpaper(fileData, groupId = null) {
    const { filename, originalName, filePath, fileSize, mimeType, name, description } = fileData;
    
    // 验证文件类型
    if (!mimeType.startsWith('image/')) {
      throw new Error('只支持图片文件');
    }

    return this.wallpaperModel.create({
      filename,
      originalName,
      filePath,
      fileSize,
      mimeType,
      groupId,
      name,
      description
    });
  }

  updateWallpaper(id, data) {
    const wallpaper = this.getWallpaperById(id);
    return this.wallpaperModel.update(id, data);
  }

  async deleteWallpaper(id) {
    const wallpaper = this.getWallpaperById(id);
    
    // 删除文件
    try {
      await fs.unlink(wallpaper.file_path);
    } catch (error) {
      console.warn('删除文件失败:', error.message);
    }

    return this.wallpaperModel.delete(id);
  }

  async deleteMultipleWallpapers(ids) {
    // 注意：这里为了简单起见，没有逐一删除物理文件
    // 在生产环境中，应该添加一个任务队列来处理这些文件的后台删除
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
      const defaultGroup = this.groupModel.getDefault();
      groupId = defaultGroup.id;
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
      throw new Error('分组不存在');
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
    const group = this.getGroupById(id);
    
    // 检查分组下是否有壁纸
    const wallpapers = this.wallpaperModel.findAll(id);
    if (wallpapers.length > 0) {
      throw new Error('分组下还有壁纸，无法删除');
    }

    return this.groupModel.delete(id);
  }
}
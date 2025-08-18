import { WallpaperModel } from '../models/wallpaper.model.js';
import { WallpaperGroupModel } from '../models/wallpaper-group.model.js';
import fs from 'fs/promises';
import path from 'path';

export class WallpaperService {
  constructor(db) {
    this.wallpaperModel = new WallpaperModel(db);
    this.groupModel = new WallpaperGroupModel(db);
  }

  async getAllWallpapers(groupId = null) {
    return this.wallpaperModel.findAll(groupId);
  }

  async getWallpaperById(id) {
    const wallpaper = await this.wallpaperModel.findById(id);
    if (!wallpaper) {
      throw new Error('壁纸不存在');
    }
    return wallpaper;
  }

  async uploadWallpaper(fileData, groupId = null) {
    const { filename, originalName, filePath, fileSize, mimeType } = fileData;
    
    // 验证文件类型
    if (!mimeType.startsWith('image/')) {
      throw new Error('只支持图片文件');
    }

    // 如果没有指定分组，使用默认分组
    if (!groupId) {
      const defaultGroup = await this.groupModel.getDefault();
      groupId = defaultGroup.id;
    }

    return this.wallpaperModel.create({
      filename,
      originalName,
      filePath,
      fileSize,
      mimeType,
      groupId
    });
  }

  async updateWallpaper(id, data) {
    const wallpaper = await this.getWallpaperById(id);
    return this.wallpaperModel.update(id, data);
  }

  async deleteWallpaper(id) {
    const wallpaper = await this.getWallpaperById(id);
    
    // 删除文件
    try {
      await fs.unlink(wallpaper.file_path);
    } catch (error) {
      console.warn('删除文件失败:', error.message);
    }

    return this.wallpaperModel.delete(id);
  }

  async setActiveWallpaper(id) {
    await this.getWallpaperById(id); // 验证壁纸存在
    return this.wallpaperModel.setActive(id);
  }

  async getActiveWallpaper() {
    return this.wallpaperModel.getActive();
  }

  async getRandomWallpaper(groupId) {
    if (!groupId) {
      const defaultGroup = await this.groupModel.getDefault();
      groupId = defaultGroup.id;
    }

    const wallpaper = await this.wallpaperModel.getRandomByGroup(groupId);
    if (wallpaper) {
      await this.wallpaperModel.setActive(wallpaper.id);
    }
    return wallpaper;
  }

  // 分组相关方法
  async getAllGroups() {
    return this.groupModel.findAll();
  }

  async getGroupById(id) {
    const group = await this.groupModel.findById(id);
    if (!group) {
      throw new Error('分组不存在');
    }
    return group;
  }

  async createGroup(data) {
    return this.groupModel.create(data);
  }

  async updateGroup(id, data) {
    await this.getGroupById(id); // 验证分组存在
    return this.groupModel.update(id, data);
  }

  async deleteGroup(id) {
    const group = await this.getGroupById(id);
    
    // 检查分组下是否有壁纸
    const wallpapers = await this.wallpaperModel.findAll(id);
    if (wallpapers.length > 0) {
      throw new Error('分组下还有壁纸，无法删除');
    }

    return this.groupModel.delete(id);
  }
}
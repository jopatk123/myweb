import { AppModel } from '../models/app.model.js';
import { AppGroupModel } from '../models/app-group.model.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

export class AppService {
  constructor(db) {
    this.appModel = new AppModel(db);
    this.groupModel = new AppGroupModel(db);

    // 获取目录路径
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.uploadsDir = path.join(__dirname, '../../uploads/apps/icons');
    this.publicIconsDir = path.join(
      __dirname,
      '../../../client/public/apps/icons'
    );
    this.presetIconsDir = path.join(__dirname, '../../preset-icons');
  }

  // 应用
  getApps(query = {}) {
    return this.appModel.findAll(query);
  }

  getAppById(id) {
    return this.appModel.findById(id);
  }

  async createApp(payload) {
    // 接受 camelCase payload，映射为 snake_case 给 model
    try {
      const { mapToSnake } = await import('../utils/field-mapper.js');
      return this.appModel.create(mapToSnake(payload));
    } catch (error) {
      // 回退：若动态 import 失败，则直接传入 payload（model 层会兼容）
      return this.appModel.create(payload);
    }
  }

  updateApp(id, payload) {
    return this.appModel.update(id, payload);
  }

  async deleteApp(id) {
    const app = this.appModel.findById(id);
    if (!app) {
      const err = new Error('应用不存在');
      err.status = 404;
      throw err;
    }
    if (app.is_builtin) {
      const err = new Error('内置应用不允许删除');
      err.status = 400;
      throw err;
    }

    // 删除前尝试清理图标文件（仅当无其他未删除应用引用该文件时）
    const iconFilename = app.icon_filename || app.iconFilename;
    if (iconFilename) {
      try {
        const count = this.appModel.countByIconFilename(iconFilename);
        // 当前这条记录仍算未删除，所以 count > 1 表示还有其他引用；== 1 表示仅此一处
        if (count <= 1) {
          const filePath = path.join(this.uploadsDir, iconFilename);
          await fs.unlink(filePath).catch(() => {});
        }
      } catch (e) {
        // 清理失败不影响删除流程，仅日志提示
        console.warn('[AppService.deleteApp] 清理图标失败:', e?.message || e);
      }
    }

    return this.appModel.hardDelete(id);
  }

  setAppVisible(id, visible) {
    return this.appModel.setVisible(id, visible);
  }

  setAppAutostart(id, autostart) {
    return this.appModel.setAutostart(id, autostart);
  }

  moveApps(ids, targetGroupId) {
    return this.appModel.moveToGroup(ids, targetGroupId);
  }

  // 分组
  getGroups() {
    return this.groupModel.findAll();
  }

  createGroup(payload) {
    return this.groupModel.create(payload);
  }

  updateGroup(id, payload) {
    return this.groupModel.update(id, payload);
  }

  deleteGroup(id) {
    return this.groupModel.softDelete(id);
  }

  // 复制预选图标到uploads目录
  async copyPresetIcon(presetIconFilename) {
    try {
      // 确保uploads目录存在
      await fs.mkdir(this.uploadsDir, { recursive: true });

      // 源文件路径（public/apps/icons目录）
      // 兼容传入为完整路径（/apps/icons/xxx.svg）或仅文件名（xxx.svg）
      const safeFilename = path.basename(presetIconFilename || '');
      const candidates = [
        path.join(this.publicIconsDir, safeFilename),
        path.join(this.presetIconsDir, safeFilename),
        // 最后才检查uploads目录，避免复制自己
        path.join(this.uploadsDir, safeFilename),
      ];
      let sourcePath = null;
      for (const p of candidates) {
        try {
          await fs.access(p);
          sourcePath = p;
          break;
        } catch (error) {
          // ignore: candidate path not found, continue to next
        }
      }
      if (!sourcePath) {
        throw new Error(`预选图标文件不存在: ${presetIconFilename}`);
      }

      // 生成新的文件名
      const ext = path.extname(safeFilename);
      const newFilename = `${uuidv4()}${ext}`;
      const targetPath = path.join(this.uploadsDir, newFilename);

      // 复制文件
      await fs.copyFile(sourcePath, targetPath);

      return newFilename;
    } catch (error) {
      console.error('复制预选图标失败:', error);
      throw new Error(`复制预选图标失败: ${error?.message || '未知错误'}`);
    }
  }

  // 删除上传的图标文件（若存在）。安全：仅按文件名删除
  async deleteIconFileIfExists(filename) {
    try {
      if (!filename) return false;
      const safe = path.basename(String(filename));
      const p = path.join(this.uploadsDir, safe);
      await fs.unlink(p);
      return true;
    } catch (e) {
      if (e && e.code === 'ENOENT') return false;
      // 其他错误打印但不抛出，避免影响主流程
      console.warn(
        '[AppService.deleteIconFileIfExists] 删除失败:',
        e?.message || e
      );
      return false;
    }
  }
}

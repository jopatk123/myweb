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
    } catch (e) {
      // 回退：若动态 import 失败，则直接传入 payload（model 层会兼容）
      return this.appModel.create(payload);
    }
  }

  updateApp(id, payload) {
    return this.appModel.update(id, payload);
  }

  deleteApp(id) {
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
    return this.appModel.softDelete(id);
  }

  setAppVisible(id, visible) {
    return this.appModel.setVisible(id, visible);
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
      const sourcePath = path.join(this.publicIconsDir, presetIconFilename);

      // 检查源文件是否存在
      try {
        await fs.access(sourcePath);
      } catch (error) {
        throw new Error(`预选图标文件不存在: ${presetIconFilename}`);
      }

      // 生成新的文件名
      const ext = path.extname(presetIconFilename);
      const newFilename = `${uuidv4()}${ext}`;
      const targetPath = path.join(this.uploadsDir, newFilename);

      // 复制文件
      await fs.copyFile(sourcePath, targetPath);

      return newFilename;
    } catch (error) {
      console.error('复制预选图标失败:', error);
      throw new Error('复制预选图标失败');
    }
  }
}

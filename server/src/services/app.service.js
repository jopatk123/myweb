import { AppModel } from '../models/app.model.js';
import { AppGroupModel } from '../models/app-group.model.js';

export class AppService {
  constructor(db) {
    this.appModel = new AppModel(db);
    this.groupModel = new AppGroupModel(db);
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
}

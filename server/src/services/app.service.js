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

  createApp(payload) {
    return this.appModel.create(payload);
  }

  updateApp(id, payload) {
    return this.appModel.update(id, payload);
  }

  deleteApp(id) {
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

import { AppModel } from '../models/app.model.js';
import { AppGroupModel } from '../models/app-group.model.js';
import { generateUniqueSlug } from '../utils/slug.js';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { APP_ICONS_DIR, PUBLIC_APP_ICONS_DIR } from '../utils/upload-path.js';
import {
  copyPresetAppIcon,
  deleteAppIconIfExists,
} from '../utils/app-icon-storage.js';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from '../utils/errors.js';

const appServiceLogger = logger.child('AppService');

function buildCreateAppPayload(payload, findBySlug) {
  const nextPayload = { ...payload };
  if (!nextPayload.slug && nextPayload.name) {
    nextPayload.slug = generateUniqueSlug(nextPayload.name, slug =>
      Boolean(findBySlug(slug))
    );
  }

  return nextPayload;
}

function buildUpdateAppPayload(id, existingApp, payload, findBySlug) {
  const nextPayload = { ...payload };
  if (
    nextPayload.name &&
    existingApp &&
    !existingApp.is_builtin &&
    existingApp.name !== nextPayload.name
  ) {
    nextPayload.slug = generateUniqueSlug(nextPayload.name, slug => {
      const found = findBySlug(slug);
      return found && found.id !== id;
    });
  }

  return nextPayload;
}

function buildCreateGroupPayload(payload, findBySlug) {
  const nextPayload = { ...payload };
  if (!nextPayload.slug && nextPayload.name) {
    nextPayload.slug = generateUniqueSlug(nextPayload.name, slug =>
      Boolean(findBySlug(slug))
    );
  }

  return nextPayload;
}

function buildUpdateGroupPayload(id, existingGroup, payload, findBySlug) {
  const nextPayload = { ...payload };
  if (
    nextPayload.name &&
    existingGroup &&
    existingGroup.name !== nextPayload.name
  ) {
    nextPayload.slug = generateUniqueSlug(nextPayload.name, slug =>
      Boolean(findBySlug(slug, id))
    );
  }

  return nextPayload;
}

function resolveAutostartTarget(idOrSlug) {
  if (idOrSlug === undefined || idOrSlug === null || idOrSlug === '') {
    throw new ValidationError('缺少应用标识');
  }

  const raw = typeof idOrSlug === 'string' ? idOrSlug.trim() : idOrSlug;
  const numericCandidate =
    typeof raw === 'number'
      ? raw
      : /^\d+$/.test(String(raw))
        ? Number(raw)
        : NaN;

  if (!Number.isNaN(numericCandidate)) {
    return { kind: 'id', value: numericCandidate };
  }

  return { kind: 'slug', value: String(raw) };
}

export class AppService {
  constructor(db) {
    this.appModel = new AppModel(db);
    this.groupModel = new AppGroupModel(db);

    this.uploadsDir = process.env.APP_ICON_UPLOAD_DIR || APP_ICONS_DIR;
    this.publicIconsDir = PUBLIC_APP_ICONS_DIR;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
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
    const nextPayload = buildCreateAppPayload(payload, slug =>
      this.appModel.findBySlug(slug)
    );
    return this.appModel.create(nextPayload);
  }

  updateApp(id, payload) {
    const existing = this.appModel.findById(id);
    const nextPayload = buildUpdateAppPayload(id, existing, payload, slug =>
      this.appModel.findBySlug(slug)
    );
    return this.appModel.update(id, nextPayload);
  }

  async deleteApp(id) {
    const app = this.appModel.findById(id);
    if (!app) throw new NotFoundError('应用不存在');
    if (app.is_builtin) throw new ForbiddenError('内置应用不允许删除');

    // 删除前尝试清理图标文件（仅当无其他未删除应用引用该文件时）
    const iconFilename = app.icon_filename;
    if (iconFilename) {
      try {
        const count = this.appModel.countByIconFilename(iconFilename);
        if (count <= 1) {
          await this.deleteIconFileIfExists(iconFilename);
        }
      } catch (e) {
        void e;
        appServiceLogger.warn('[AppService.deleteApp] 清理图标失败', {
          error: e?.message || e,
        });
      }
    }

    return this.appModel.hardDelete(id);
  }

  setAppVisible(id, visible) {
    return this.appModel.setVisible(id, visible);
  }

  setAppAutostart(idOrSlug, autostart) {
    const target = resolveAutostartTarget(idOrSlug);

    let app;
    if (target.kind === 'id') {
      app = this.appModel.setAutostart(target.value, autostart);
    } else {
      app = this.appModel.setAutostartBySlug(target.value, autostart);
    }

    if (!app) throw new NotFoundError('应用不存在');

    return app;
  }

  moveApps(ids, targetGroupId) {
    return this.appModel.moveToGroup(ids, targetGroupId);
  }

  // 分组
  getGroups() {
    return this.groupModel.findAll();
  }

  createGroup(payload) {
    const nextPayload = buildCreateGroupPayload(payload, slug =>
      this.groupModel.findBySlug(slug)
    );
    return this.groupModel.create(nextPayload);
  }

  updateGroup(id, payload) {
    const existing = this.groupModel.findById(id);
    const nextPayload = buildUpdateGroupPayload(
      id,
      existing,
      payload,
      (slug, excludeId) => this.groupModel.findBySlug(slug, excludeId)
    );
    return this.groupModel.update(id, nextPayload);
  }

  deleteGroup(id) {
    return this.groupModel.softDelete(id);
  }

  // 复制预选图标到uploads目录
  async copyPresetIcon(presetIconFilename) {
    try {
      return await copyPresetAppIcon({
        uploadsDir: this.uploadsDir,
        publicIconsDir: this.publicIconsDir,
        presetIconsDir: this.presetIconsDir,
        presetIconFilename,
      });
    } catch (error) {
      void error;
      appServiceLogger.error('复制预选图标失败');
      throw new Error(`复制预选图标失败: ${error?.message || '未知错误'}`);
    }
  }

  // 删除上传的图标文件（若存在）。安全：仅按文件名删除
  async deleteIconFileIfExists(filename) {
    try {
      return await deleteAppIconIfExists({
        uploadsDir: this.uploadsDir,
        filename,
      });
    } catch (e) {
      if (e && e.code === 'ENOENT') return false;
      appServiceLogger.warn('[AppService.deleteIconFileIfExists] 删除失败', {
        error: e?.message || e,
      });
      return false;
    }
  }
}

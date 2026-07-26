import { AppService } from '../services/app.service.js';
import { mapToSnake } from '../utils/field-mapper.js';
import {
  applyPresetIconPayload,
  buildCreateAppPayload,
  buildUpdateAppPayload,
  validateAppPayload,
} from '../utils/app-request.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const appCtrlLogger = logger.child('AppController');

export class AppController {
  constructor(db) {
    this.service = new AppService(db);
  }

  async list(req, res, next) {
    try {
      // req.query 已被中间件归一化为 camelCase
      const { groupId, visible, page, limit } = req.query;
      const query = {
        groupId: groupId || null,
        visible:
          visible !== undefined ? visible === '1' || visible === 'true' : null,
        page: page ? Number(page) : null,
        limit: limit ? Number(limit) : null,
      };
      const result = await this.service.getApps(query);
      res.json({ code: 200, data: result, message: '获取成功' });
    } catch (error) {
      next(error);
    }
  }

  async get(req, res, next) {
    try {
      const app = await this.service.getAppById(Number(req.params.id));
      if (!app)
        return res.status(404).json({ code: 404, message: '应用不存在' });
      res.json({ code: 200, data: app, message: '获取成功' });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const validatedPayload = await validateAppPayload(req.body, {
        requireName: true,
        normalizeEmptyGroupId: true,
      });
      const payloadWithPresetIcon = await applyPresetIconPayload(
        validatedPayload,
        presetIcon => this.service.copyPresetIcon(presetIcon)
      );
      const app = await this.service.createApp(
        buildCreateAppPayload(payloadWithPresetIcon)
      );
      res.status(201).json({ code: 201, data: app, message: '创建成功' });
    } catch (error) {
      appCtrlLogger.error('create 错误', error);
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);

      // 检查应用是否存在且不是内置应用
      const existingApp = await this.service.getAppById(id);
      if (!existingApp) {
        throw new NotFoundError('应用不存在');
      }
      if (existingApp.is_builtin) {
        throw new ForbiddenError('内置应用不允许编辑');
      }

      const validatedPayload = await validateAppPayload(req.body, {
        requireName: false,
      });
      const payloadWithPresetIcon = await applyPresetIconPayload(
        validatedPayload,
        presetIcon => this.service.copyPresetIcon(presetIcon)
      );
      const app = await this.service.updateApp(
        id,
        buildUpdateAppPayload(payloadWithPresetIcon)
      );
      res.json({ code: 200, data: app, message: '更新成功' });
    } catch (error) {
      appCtrlLogger.error('update 错误', error);
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      await this.service.deleteApp(id);
      res.json({ code: 200, message: '删除成功' });
    } catch (error) {
      next(error);
    }
  }

  async setVisible(req, res, next) {
    try {
      const id = Number(req.params.id);
      // req.body.visible 已由 dto schema 转换为强 boolean，避免字符串 "false" 被当作 true
      const { visible } = req.body;
      const app = await this.service.setAppVisible(id, visible);
      if (!app) throw new NotFoundError('应用不存在');
      res.json({ code: 200, data: app, message: '设置成功' });
    } catch (error) {
      next(error);
    }
  }

  async setAutostart(req, res, next) {
    try {
      const paramRaw = (req.params.id ?? '').toString().trim();
      if (!paramRaw) {
        return res.status(400).json({ code: 400, message: '缺少应用标识' });
      }
      // req.body.isAutostart 已由 dto schema 转换为强 boolean
      const { isAutostart } = req.body;
      const app = await this.service.setAppAutostart(paramRaw, isAutostart);
      res.json({ code: 200, data: app, message: '设置成功' });
    } catch (error) {
      next(error);
    }
  }

  async bulkVisible(req, res, next) {
    try {
      const { ids, visible } = req.body;
      const results = await Promise.all(
        ids.map(id => this.service.setAppVisible(Number(id), visible))
      );
      const updated = results.filter(Boolean).length;
      res.json({
        code: 200,
        data: { updated },
        message: '批量设置成功',
      });
    } catch (error) {
      next(error);
    }
  }

  async move(req, res, next) {
    try {
      const { ids, targetGroupId } = req.body;
      const moved = await this.service.moveApps(ids, targetGroupId);
      res.json({ code: 200, data: { moved }, message: '移动成功' });
    } catch (error) {
      next(error);
    }
  }

  // 分组
  async listGroups(req, res, next) {
    try {
      const groups = await this.service.getGroups();
      res.json({ code: 200, data: groups, message: '获取成功' });
    } catch (error) {
      next(error);
    }
  }

  async createGroup(req, res, next) {
    try {
      // req.body 已由 dto schema 校验，仅包含 name（API 不允许调用方设置 isDefault）
      const group = await this.service.createGroup(mapToSnake(req.body));
      res.status(201).json({ code: 201, data: group, message: '创建成功' });
    } catch (error) {
      next(error);
    }
  }

  async updateGroup(req, res, next) {
    try {
      const id = Number(req.params.id);
      const group = await this.service.updateGroup(id, mapToSnake(req.body));
      res.json({ code: 200, data: group, message: '更新成功' });
    } catch (err) {
      next(err);
    }
  }

  async deleteGroup(req, res, next) {
    try {
      const id = Number(req.params.id);
      await this.service.deleteGroup(id);
      res.json({ code: 200, message: '删除成功' });
    } catch (err) {
      next(err);
    }
  }
}

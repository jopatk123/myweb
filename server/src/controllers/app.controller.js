import Joi from 'joi';
import { AppService } from '../services/app.service.js';
import { mapToSnake } from '../utils/field-mapper.js';
import {
  applyPresetIconPayload,
  buildCreateAppPayload,
  buildUpdateAppPayload,
  validateAppPayload,
} from '../utils/app-request.js';
import logger from '../utils/logger.js';

const appCtrlLogger = logger.child('AppController');

export class AppController {
  constructor(db) {
    this.service = new AppService(db);
  }

  async list(req, res, next) {
    try {
      // req.query is normalized to camelCase by middleware, so accept camelCase keys
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
        const err = new Error('应用不存在');
        err.status = 404;
        throw err;
      }
      if (existingApp.is_builtin) {
        const err = new Error('内置应用不允许编辑');
        err.status = 400;
        throw err;
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
      const { visible } = req.body;
      const app = await this.service.setAppVisible(id, !!visible);
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
      // middleware 已将请求体归一化为 camelCase，直接读取 isAutostart
      const body = req.body || {};
      const autostartRaw = body.isAutostart;
      // 强制布尔化（支持字符串 '0'/'1' 或数字）
      const autostart = !!(autostartRaw === '0' || autostartRaw === 0
        ? false
        : autostartRaw);
      const app = this.service.setAppAutostart(paramRaw, autostart);
      res.json({ code: 200, data: app, message: '设置成功' });
    } catch (error) {
      next(error);
    }
  }

  async bulkVisible(req, res, next) {
    try {
      const { ids, visible } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(400)
          .json({ code: 400, message: 'ids 必须为非空数组' });
      }
      await Promise.all(
        ids.map(id => this.service.setAppVisible(Number(id), !!visible))
      );
      res.json({ code: 200, message: '批量设置成功' });
    } catch (error) {
      next(error);
    }
  }

  async move(req, res, next) {
    try {
      const { ids, targetGroupId } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(400)
          .json({ code: 400, message: 'ids 必须为非空数组' });
      }
      await this.service.moveApps(ids.map(Number), Number(targetGroupId));
      res.json({ code: 200, message: '移动成功' });
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
      const schema = Joi.object({
        name: Joi.string().min(1).max(100).required(),
        isDefault: Joi.boolean().optional(),
      });
      const payload = await schema.validateAsync(req.body);
      const group = await this.service.createGroup(mapToSnake(payload));
      res.status(201).json({ code: 201, data: group, message: '创建成功' });
    } catch (error) {
      next(error);
    }
  }

  async updateGroup(req, res, next) {
    try {
      const id = Number(req.params.id);
      const schema = Joi.object({
        name: Joi.string().min(1).max(100).optional(),
        isDefault: Joi.boolean().optional(),
      });
      const payload = await schema.validateAsync(req.body);
      const group = await this.service.updateGroup(id, mapToSnake(payload));
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

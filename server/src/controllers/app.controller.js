import Joi from 'joi';
import { AppService } from '../services/app.service.js';

const appSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  slug: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .required(),
  description: Joi.string().allow(null, '').optional(),
  icon_filename: Joi.string().allow(null, '').optional(),
  preset_icon: Joi.string().allow(null, '').optional(),
  group_id: Joi.alternatives()
    .try(Joi.number().integer().allow(null), Joi.string().allow('', null))
    .optional(),
  is_visible: Joi.boolean().optional(),
  is_autostart: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().integer().valid(0, 1))
    .optional(),
  is_builtin: Joi.boolean().optional(),
  target_url: Joi.string().uri().allow(null, '').optional(),
});

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
      void result;
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
      // 支持前端发送 camelCase：先把 req.body 转为 snake_case 以匹配 Joi schema
      const { mapToSnake } = await import('../utils/field-mapper.js');
      const bodySnake = mapToSnake(req.body || {});
      // 启用 Joi 的类型转换（例如字符串数字 -> number）以确保 group_id 被转换为 number
      const payload = await appSchema.validateAsync(bodySnake, {
        convert: true,
      });

      // 处理前端可能发送的空字符串：把空字符串归一为 null
      if (payload.group_id === '') payload.group_id = null;

      // 处理预选图标：如果使用预选图标，将其复制到uploads目录并设置icon_filename
      if (payload.preset_icon && !payload.icon_filename) {
        const iconFilename = await this.service.copyPresetIcon(
          payload.preset_icon
        );
        payload.icon_filename = iconFilename;
        delete payload.preset_icon; // 移除临时字段
      }

      // 对于自定义 APP，强制 is_builtin = 0；内置 APP 由我们手工种子/维护
      const app = await this.service.createApp({
        ...payload,
        is_builtin: payload.is_builtin ? 1 : 0,
      });
      res.status(201).json({ code: 201, data: app, message: '创建成功' });
    } catch (error) {
      console.error('[AppController.create] 错误:', error);
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      // 支持前端发送 camelCase：先把 req.body 转为 snake_case 以匹配 Joi schema
      const { mapToSnake } = await import('../utils/field-mapper.js');
      const bodySnake = mapToSnake(req.body || {});

      // 开启 Joi 类型转换，兼容前端字符串数字等情况
      const payload = await appSchema
        .fork(['name', 'slug'], s => s.optional())
        .validateAsync(bodySnake, { convert: true });

      // 禁止将应用改为内置
      if (payload.is_builtin) delete payload.is_builtin;
      const app = await this.service.updateApp(id, payload);
      res.json({ code: 200, data: app, message: '更新成功' });
    } catch (error) {
      console.error('AppController.update - error:', error);
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
      // 兼容前端可能发送的字段名：autostart / is_autostart / isAutostart
      const body = req.body || {};
      const autostartRaw =
        body.autostart !== undefined
          ? body.autostart
          : body.is_autostart !== undefined
            ? body.is_autostart
            : body.isAutostart;
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
        slug: Joi.string()
          .pattern(/^[a-z0-9-]+$/)
          .optional(),
        is_default: Joi.boolean().optional(),
      });
      const payload = await schema.validateAsync(req.body);
      const group = await this.service.createGroup(payload);
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
        slug: Joi.string()
          .pattern(/^[a-z0-9-]+$/)
          .optional(),
        is_default: Joi.boolean().optional(),
      });
      const payload = await schema.validateAsync(req.body);
      const group = await this.service.updateGroup(id, payload);
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

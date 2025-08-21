import Joi from 'joi';
import { AppService } from '../services/app.service.js';

const appSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).required(),
  description: Joi.string().allow(null, '').optional(),
  icon_filename: Joi.string().allow(null, '').optional(),
  group_id: Joi.number().integer().allow(null).optional(),
  is_visible: Joi.boolean().optional()
});

export class AppController {
  constructor(db) {
    this.service = new AppService(db);
  }

  async list(req, res, next) {
    try {
      const { group_id, visible, page, limit } = req.query;
      const query = {
        groupId: group_id || null,
        visible: visible !== undefined ? (visible === '1' || visible === 'true') : null,
        page: page ? Number(page) : null,
        limit: limit ? Number(limit) : null
      };
      const result = await this.service.getApps(query);
      res.json({ code: 200, data: result, message: '获取成功' });
    } catch (err) { next(err); }
  }

  async get(req, res, next) {
    try {
      const app = await this.service.getAppById(Number(req.params.id));
      if (!app) return res.status(404).json({ code: 404, message: '应用不存在' });
      res.json({ code: 200, data: app, message: '获取成功' });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const payload = await appSchema.validateAsync(req.body);
      const app = await this.service.createApp(payload);
      res.status(201).json({ code: 201, data: app, message: '创建成功' });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      const payload = await appSchema.fork(['name','slug'], (s) => s.optional()).validateAsync(req.body);
      const app = await this.service.updateApp(id, payload);
      res.json({ code: 200, data: app, message: '更新成功' });
    } catch (err) { next(err); }
  }

  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      await this.service.deleteApp(id);
      res.json({ code: 200, message: '删除成功' });
    } catch (err) { next(err); }
  }

  async setVisible(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { visible } = req.body;
      const app = await this.service.setAppVisible(id, !!visible);
      res.json({ code: 200, data: app, message: '设置成功' });
    } catch (err) { next(err); }
  }

  async bulkVisible(req, res, next) {
    try {
      const { ids, visible } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 400, message: 'ids 必须为非空数组' });
      }
      await Promise.all(ids.map(id => this.service.setAppVisible(Number(id), !!visible)));
      res.json({ code: 200, message: '批量设置成功' });
    } catch (err) { next(err); }
  }

  async move(req, res, next) {
    try {
      const { ids, targetGroupId } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 400, message: 'ids 必须为非空数组' });
      }
      await this.service.moveApps(ids.map(Number), Number(targetGroupId));
      res.json({ code: 200, message: '移动成功' });
    } catch (err) { next(err); }
  }

  // 分组
  async listGroups(req, res, next) {
    try {
      const groups = await this.service.getGroups();
      res.json({ code: 200, data: groups, message: '获取成功' });
    } catch (err) { next(err); }
  }

  async createGroup(req, res, next) {
    try {
      const schema = Joi.object({
        name: Joi.string().min(1).max(100).required(),
        slug: Joi.string().pattern(/^[a-z0-9-]+$/).optional(),
        is_default: Joi.boolean().optional()
      });
      const payload = await schema.validateAsync(req.body);
      const group = await this.service.createGroup(payload);
      res.status(201).json({ code: 201, data: group, message: '创建成功' });
    } catch (err) { next(err); }
  }

  async updateGroup(req, res, next) {
    try {
      const id = Number(req.params.id);
      const schema = Joi.object({
        name: Joi.string().min(1).max(100).optional(),
        slug: Joi.string().pattern(/^[a-z0-9-]+$/).optional(),
        is_default: Joi.boolean().optional()
      });
      const payload = await schema.validateAsync(req.body);
      const group = await this.service.updateGroup(id, payload);
      res.json({ code: 200, data: group, message: '更新成功' });
    } catch (err) { next(err); }
  }

  async deleteGroup(req, res, next) {
    try {
      const id = Number(req.params.id);
      await this.service.deleteGroup(id);
      res.json({ code: 200, message: '删除成功' });
    } catch (err) { next(err); }
  }
}



import Joi from 'joi';
import { NotebookNoteService } from '../services/notebook-note.service.js';

const noteSchema = Joi.object({
  title: Joi.string().min(1).max(300).required(),
  description: Joi.string().allow('', null).optional(),
  category: Joi.string().allow('', null).optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  completed: Joi.boolean().optional(),
});

export class NotebookNoteController {
  constructor(db) {
    this.service = new NotebookNoteService(db);
  }

  async list(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        search = '',
        status = 'all',
        category = 'all',
      } = req.query;
      const result = this.service.list({
        page: Number(page) || 1,
        limit: Number(limit) || 50,
        search: search || '',
        status: status || 'all',
        category: category || 'all',
      });
      res.json({ code: 200, data: result, message: '获取成功' });
    } catch (e) {
      next(e);
    }
  }

  async get(req, res, next) {
    try {
      const id = Number(req.params.id);
      const row = this.service.get(id);
      res.json({ code: 200, data: row, message: '获取成功' });
    } catch (e) {
      next(e);
    }
  }

  async create(req, res, next) {
    try {
      const payload = await noteSchema.validateAsync(req.body, {
        convert: true,
      });
      const row = this.service.create(payload);
      res.status(201).json({ code: 201, data: row, message: '创建成功' });
    } catch (e) {
      next(e);
    }
  }

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      const payload = await noteSchema
        .fork(['title'], s => s.optional())
        .validateAsync(req.body, { convert: true });
      const row = this.service.update(id, payload);
      res.json({ code: 200, data: row, message: '更新成功' });
    } catch (e) {
      next(e);
    }
  }

  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      this.service.remove(id);
      res.json({ code: 200, message: '删除成功' });
    } catch (e) {
      next(e);
    }
  }
}

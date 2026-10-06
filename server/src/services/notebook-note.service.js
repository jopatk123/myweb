import { NotebookNoteModel } from '../models/notebook-note.model.js';
import { NotFoundError } from '../utils/errors.js';

export class NotebookNoteService {
  constructor(db) {
    this.model = new NotebookNoteModel(db);
  }

  list(params) {
    return this.model.findAll(params);
  }

  get(id) {
    const row = this.model.findById(id);
    if (!row) throw new NotFoundError('笔记不存在');
    return row;
  }

  create(data) {
    return this.model.create(data);
  }

  update(id, data) {
    const row = this.model.update(id, data);
    // 与 get 对齐：更新不存在的笔记必须返回 404，
    // 否则前端会拿到空 data 并误建本地幽灵记录
    if (!row) throw new NotFoundError('笔记不存在');
    return row;
  }

  remove(id) {
    // 与 get/update 对齐：删除不存在的笔记返回 404，
    // 避免客户端误以为删除成功而丢弃本地数据
    const row = this.model.findById(id);
    if (!row) throw new NotFoundError('笔记不存在');
    return this.model.delete(id);
  }

  /** 批量删除：幂等语义，返回实际删除行数 */
  removeMany(ids) {
    return this.model.deleteMany(ids);
  }
}

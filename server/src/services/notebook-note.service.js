import { NotebookNoteModel } from '../models/notebook-note.model.js';

export class NotebookNoteService {
  constructor(db) {
    this.model = new NotebookNoteModel(db);
  }

  list(params) {
    return this.model.findAll(params);
  }

  get(id) {
    const row = this.model.findById(id);
    if (!row) {
      const err = new Error('笔记不存在');
      err.status = 404;
      throw err;
    }
    return row;
  }

  create(data) {
    return this.model.create(data);
  }

  update(id, data) {
    return this.model.update(id, data);
  }

  remove(id) {
    return this.model.delete(id);
  }
}

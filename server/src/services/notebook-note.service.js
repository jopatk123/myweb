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
    return this.model.update(id, data);
  }

  remove(id) {
    return this.model.delete(id);
  }
}

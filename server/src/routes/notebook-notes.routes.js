import express from 'express';
import { NotebookNoteController } from '../controllers/notebook-note.controller.js';

export function createNotebookNotesRoutes(db) {
  const router = express.Router();
  const controller = new NotebookNoteController(db);

  router.get('/', (req, res, next) => controller.list(req, res, next));
  router.get('/:id(\\d+)', (req, res, next) => controller.get(req, res, next));
  router.post('/', (req, res, next) => controller.create(req, res, next));
  router.put('/:id(\\d+)', (req, res, next) =>
    controller.update(req, res, next)
  );
  router.delete('/:id(\\d+)', (req, res, next) =>
    controller.remove(req, res, next)
  );

  return router;
}

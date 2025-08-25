import express from 'express';
import WorkTimerController from '../controllers/worktimer.controller.js';

export function createWorkTimerRoutes(db) {
  const router = express.Router();
  const controller = new WorkTimerController(db);

  router.post('/start', (req, res, next) => controller.start(req, res, next));
  router.post('/heartbeat', (req, res, next) =>
    controller.heartbeat(req, res, next)
  );
  router.post('/stop', (req, res, next) => controller.stop(req, res, next));
  router.get('/stats', (req, res, next) => controller.stats(req, res, next));

  return router;
}

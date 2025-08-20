import express from 'express';
import { AppController } from '../controllers/app.controller.js';

export function createAppRoutes(db) {
  const router = express.Router();
  const controller = new AppController(db);

  // 应用
  router.get('/', (req, res, next) => controller.list(req, res, next));
  router.get('/:id(\\d+)', (req, res, next) => controller.get(req, res, next));
  router.post('/', (req, res, next) => controller.create(req, res, next));
  router.put('/:id(\\d+)', (req, res, next) => controller.update(req, res, next));
  router.delete('/:id(\\d+)', (req, res, next) => controller.remove(req, res, next));
  router.put('/:id(\\d+)/visible', (req, res, next) => controller.setVisible(req, res, next));
  router.put('/bulk/visible', (req, res, next) => controller.bulkVisible(req, res, next));
  router.put('/move', (req, res, next) => controller.move(req, res, next));

  // 分组
  router.get('/groups/all', (req, res, next) => controller.listGroups(req, res, next));
  router.post('/groups', (req, res, next) => controller.createGroup(req, res, next));
  router.put('/groups/:id', (req, res, next) => controller.updateGroup(req, res, next));
  router.delete('/groups/:id', (req, res, next) => controller.deleteGroup(req, res, next));

  return router;
}



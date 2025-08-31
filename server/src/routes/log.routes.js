// Deprecated: file-based AI log routes removed.
// This stub remains only to avoid import errors if any stale code references it.
import express from 'express';
export function createLogRoutes() {
  const router = express.Router();
  router.all('*', (_req, res) => {
    res.status(410).json({ code: 410, message: 'AI file log API removed' });
  });
  return router;
}

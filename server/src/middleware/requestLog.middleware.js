import logger from '../utils/logger.js';

const requestLogger = logger.child('AccessLog');

export function createRequestLogMiddleware(log = requestLogger) {
  return (req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      log.info('HTTP request completed', {
        method: req.method,
        path: req.originalUrl || req.url || req.path,
        status: res.statusCode,
        durationMs: Math.max(0, Date.now() - startedAt),
        ip: req.ip,
      });
    });

    next();
  };
}

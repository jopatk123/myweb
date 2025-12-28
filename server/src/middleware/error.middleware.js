import logger from '../utils/logger.js';
import { appEnv } from '../config/env.js';

const errorLogger = logger.child('ErrorHandler');

export default function errorHandler(err, req, res, _next) {
  void _next;
  // 分类错误处理
  let status = err?.status || 500;
  let message = err?.message || 'Internal Server Error';

  // 数据库错误
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    status = 400;
    message = '数据已存在';
  } else if (err.code === 'SQLITE_CONSTRAINT_FOREIGN') {
    status = 400;
    message = '关联数据不存在';
  }

  // Multer错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 400;
    message = '文件大小超出限制';
  } else if (err.code === 'UNSUPPORTED_FILE_TYPE') {
    status = 400;
    message = '不支持的文件类型';
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    // Multer 语义：表单字段名不符合预期（例如后端期待 field="file"，但前端传了其它字段）
    status = 400;
    message = '上传字段不正确';
  }

  // 日志记录（使用最终 status，避免误导）
  errorLogger.error('Unhandled error caught by Express middleware', {
    path: req?.path,
    method: req?.method,
    status,
    requestId: req?.headers?.['x-request-id'],
    error: err,
  });

  const response = {
    code: status,
    message: status < 500 ? message : 'Internal Server Error',
    timestamp: new Date().toISOString(),
  };

  // 返回详细错误信息仅在非生产环境使用，避免泄露敏感信息
  if (!appEnv.isProduction) {
    response.stack = err.stack;
    response.originalMessage = err.message;
  }

  res.status(status).json(response);
}

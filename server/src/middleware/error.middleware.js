export default function errorHandler(err, req, res, _next) {
  void _next;
  // 日志记录
  console.error(`[${new Date().toISOString()}] ${err.stack}`);

  // 分类错误处理
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

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
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    status = 400;
    message = '不支持的文件类型';
  }

  const response = {
    code: status,
    message: status < 500 ? message : 'Internal Server Error',
    timestamp: new Date().toISOString(),
  };

  // 返回详细错误信息以便调试（在开发环境或短期调试时有用）
  response.stack = err.stack;
  response.originalMessage = err.message;

  res.status(status).json(response);
}

/**
 * 统一错误类体系
 *
 * 使用方式：
 *   throw new NotFoundError('应用不存在');
 *   throw new ValidationError('参数不合法');
 *   throw new ConflictError('数据已存在');
 *
 * 错误中间件会自动识别 status 字段，返回对应的 HTTP 状态码。
 */

/**
 * 基础业务错误
 * @param {string} message - 错误消息
 * @param {number} status  - HTTP 状态码
 * @param {string} [code]  - 业务错误码（可选，方便前端识别）
 */
export class AppError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    // 保留原始堆栈
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** 404 资源未找到 */
export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404, 'NOT_FOUND');
  }
}

/** 400 请求参数有误 */
export class ValidationError extends AppError {
  constructor(message = '请求参数有误') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/** 409 数据冲突（重复）*/
export class ConflictError extends AppError {
  constructor(message = '数据已存在') {
    super(message, 409, 'CONFLICT');
  }
}

/** 403 操作受限 */
export class ForbiddenError extends AppError {
  constructor(message = '无权执行此操作') {
    super(message, 403, 'FORBIDDEN');
  }
}

/** 401 未认证 */
export class UnauthorizedError extends AppError {
  constructor(message = '未认证，请先登录') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/** 500 内部服务器错误（兜底） */
export class InternalError extends AppError {
  constructor(message = '服务器内部错误') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

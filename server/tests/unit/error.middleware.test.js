import { jest } from '@jest/globals';

// Mock logger and env
jest.unstable_mockModule('../../src/utils/logger.js', () => {
  const noop = () => {};
  const childLogger = {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    child: () => childLogger,
  };
  return { default: childLogger, logger: childLogger };
});

jest.unstable_mockModule('../../src/config/env.js', () => ({
  appEnv: {
    isProduction: false,
    isTest: true,
  },
}));

const { default: errorHandler } = await import(
  '../../src/middleware/error.middleware.js'
);

function createMockReqRes() {
  const req = {
    path: '/api/test',
    method: 'GET',
    headers: { 'x-request-id': 'req-123' },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('errorHandler middleware', () => {
  it('handles generic errors with default 500 status', () => {
    const { req, res, next } = createMockReqRes();
    const err = new Error('Something went wrong');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 500,
        message: 'Internal Server Error',
      })
    );
  });

  it('preserves custom error status', () => {
    const { req, res, next } = createMockReqRes();
    const err = new Error('未找到资源');
    err.status = 404;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 404,
        message: '未找到资源',
      })
    );
  });

  it('handles SQLITE_CONSTRAINT_UNIQUE errors', () => {
    const { req, res, next } = createMockReqRes();
    const err = new Error('UNIQUE constraint failed');
    err.code = 'SQLITE_CONSTRAINT_UNIQUE';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 409,
        message: '数据已存在',
      })
    );
  });

  it('handles SQLITE_CONSTRAINT_FOREIGN errors', () => {
    const { req, res, next } = createMockReqRes();
    const err = new Error('FOREIGN KEY constraint failed');
    err.code = 'SQLITE_CONSTRAINT_FOREIGN';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: '关联数据不存在',
      })
    );
  });

  it('handles LIMIT_FILE_SIZE multer error', () => {
    const { req, res, next } = createMockReqRes();
    const err = new Error('File too large');
    err.code = 'LIMIT_FILE_SIZE';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: '文件大小超出限制',
      })
    );
  });

  it('handles UNSUPPORTED_FILE_TYPE error', () => {
    const { req, res, next } = createMockReqRes();
    const err = new Error('Unsupported');
    err.code = 'UNSUPPORTED_FILE_TYPE';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: '不支持的文件类型',
      })
    );
  });

  it('handles LIMIT_UNEXPECTED_FILE error', () => {
    const { req, res, next } = createMockReqRes();
    const err = new Error('Unexpected field');
    err.code = 'LIMIT_UNEXPECTED_FILE';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: '上传字段不正确',
      })
    );
  });

  it('includes stack and originalMessage in non-production env', () => {
    const { req, res, next } = createMockReqRes();
    const err = new Error('Debug info');
    err.status = 400;

    errorHandler(err, req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('stack');
    expect(body).toHaveProperty('originalMessage', 'Debug info');
  });

  it('includes timestamp in response', () => {
    const { req, res, next } = createMockReqRes();
    const err = new Error('Any error');

    errorHandler(err, req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('timestamp');
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });

  it('handles Joi validation errors as 400', () => {
    const { req, res, next } = createMockReqRes();
    const err = {
      isJoi: true,
      message: '"name" is required',
      details: [{ message: '"name" 为必填字段' }],
    };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 400,
        message: '"name" 为必填字段',
      })
    );
  });

  it('handles Joi error without details gracefully', () => {
    const { req, res, next } = createMockReqRes();
    const err = {
      isJoi: true,
      message: 'Validation failed',
      details: [],
    };

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400 })
    );
  });
});

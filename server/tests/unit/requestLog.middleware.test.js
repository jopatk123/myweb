import { jest } from '@jest/globals';

const info = jest.fn();
const childLogger = {
  debug: jest.fn(),
  info,
  warn: jest.fn(),
  error: jest.fn(),
  child: () => childLogger,
};

jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: childLogger,
  logger: childLogger,
}));

const { createRequestLogMiddleware } = await import(
  '../../src/middleware/requestLog.middleware.js'
);

describe('requestLog middleware', () => {
  beforeEach(() => {
    info.mockClear();
  });

  test('logs request metadata after the response finishes', () => {
    const middleware = createRequestLogMiddleware();
    const finishHandlers = [];
    const req = {
      method: 'GET',
      originalUrl: '/api/files?page=1',
      ip: '127.0.0.1',
    };
    const res = {
      statusCode: 204,
      on: jest.fn((event, handler) => {
        if (event === 'finish') finishHandlers.push(handler);
        return res;
      }),
    };
    const next = jest.fn();

    middleware(req, res, next);
    finishHandlers[0]();

    expect(next).toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(
      'HTTP request completed',
      expect.objectContaining({
        method: 'GET',
        path: '/api/files?page=1',
        status: 204,
        ip: '127.0.0.1',
      })
    );
  });
});

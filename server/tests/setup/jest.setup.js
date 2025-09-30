import { afterEach, jest } from '@jest/globals';

process.env.NODE_ENV = 'test';

if (!process.env.DB_PATH) {
  process.env.DB_PATH = ':memory:';
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

// NOTE: --experimental-vm-modules must be set BEFORE the Node.js process
// starts so that Jest can handle ESM test files. This is done via:
//   • npm scripts: cross-env NODE_OPTIONS=--experimental-vm-modules jest
//   • VS Code Jest extension: .vscode/settings.json "jest.nodeEnv"
// Setting process.env.NODE_OPTIONS here has no effect on the current process.

export default {
  testEnvironment: 'node',
  testTimeout: 60000,
  maxWorkers: '50%',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['js', 'mjs', 'json'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)', '**/?(*.)+(spec|test).mjs'],
  testPathIgnorePatterns: ['<rootDir>/../client/'],
  transform: {},
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  // 阈值锁定当前实测基线（约 91.7/81.1/93.2/92.8），允许小幅波动；
  // 若新增模块降低覆盖，应优先补测试而非下调阈值。
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 75,
      functions: 88,
      lines: 87,
    },
  },
};

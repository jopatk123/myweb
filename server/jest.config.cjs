// NOTE: --experimental-vm-modules must be set BEFORE the Node.js process
// starts so that Jest can handle ESM test files.  This is done via:
//   • npm scripts: cross-env NODE_OPTIONS=--experimental-vm-modules jest
//   • VS Code Jest extension: .vscode/settings.json "jest.nodeEnv"
// Setting process.env.NODE_OPTIONS here has no effect on the current process.

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['js', 'mjs', 'json'],
  testMatch: [
    '**/?(*.)+(spec|test).[tj]s?(x)',
    '**/?(*.)+(spec|test).mjs',
  ],
  testPathIgnorePatterns: ['<rootDir>/../client/'],
  transform: {},
  // jest.setup.js is ESM (package.json: "type": "module").
  // The VS Code Jest extension must set NODE_OPTIONS=--experimental-vm-modules
  // (see .vscode/settings.json "jest.nodeEnv") so this file can be loaded.
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      statements: 40,
      branches: 30,
      functions: 35,
      lines: 40,
    },
  },
};

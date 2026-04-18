/**
 * Jest setup file (CommonJS) — loaded via setupFilesAfterEnv.
 *
 * Why .cjs?  server/package.json declares "type": "module", which makes Node.js
 * treat every .js file as ESM.  The VS Code Jest extension may invoke Jest
 * without the --experimental-vm-modules flag, causing the ESM import in the
 * original jest.setup.js to throw a SyntaxError.  Using a .cjs extension
 * forces Node.js to load this file as CommonJS regardless of the package type,
 * so the setup runs successfully in all execution contexts.
 *
 * Note: `jest` is injected as a global by Jest itself; do NOT import it from
 * @jest/globals here — that would cause "Identifier 'jest' has already been
 * declared" in the CJS runtime.
 */

process.env.NODE_ENV = 'test';

if (!process.env.DB_PATH) {
  process.env.DB_PATH = ':memory:';
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

/* eslint-env jest */
/**
 * 该文件用于阻止 Jest 在 workspace 根目录解析 Vitest 测试。
 * 实际断言逻辑位于同目录的 `gameUtils.spec.mjs` 中，仅供 Vitest 运行。
 */
describe.skip('gameUtils vitest suite placeholder', () => {});

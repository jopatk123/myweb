import { createUploadDirs } from '../../src/utils/file-helper.js';

describe('file-helper utilities', () => {
  describe('createUploadDirs()', () => {
    test('completes without throwing', async () => {
      await expect(createUploadDirs()).resolves.not.toThrow();
    });
  });
});

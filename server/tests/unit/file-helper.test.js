import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import {
  createUploadDirs,
  getFileExtension,
  isImageFile,
  deleteFile,
} from '../../src/utils/file-helper.js';

describe('file-helper utilities', () => {
  describe('getFileExtension()', () => {
    test('returns lowercase extension', () => {
      expect(getFileExtension('photo.JPG')).toBe('.jpg');
    });

    test('returns extension for multi-dot filename', () => {
      expect(getFileExtension('archive.tar.gz')).toBe('.gz');
    });

    test('returns empty string for no extension', () => {
      expect(getFileExtension('README')).toBe('');
    });

    test('handles dotfile', () => {
      expect(getFileExtension('.gitignore')).toBe('');
    });
  });

  describe('isImageFile()', () => {
    test('returns true for image/jpeg', () => {
      expect(isImageFile('image/jpeg')).toBe(true);
    });

    test('returns true for image/png', () => {
      expect(isImageFile('image/png')).toBe(true);
    });

    test('returns false for text/plain', () => {
      expect(isImageFile('text/plain')).toBe(false);
    });

    test('returns false for application/pdf', () => {
      expect(isImageFile('application/pdf')).toBe(false);
    });
  });

  describe('deleteFile()', () => {
    test('deletes an existing file and returns true', async () => {
      const tmpPath = path.join(os.tmpdir(), `del-test-${Date.now()}.txt`);
      await fs.writeFile(tmpPath, 'test content');
      const result = await deleteFile(tmpPath);
      expect(result).toBe(true);
      await expect(fs.access(tmpPath)).rejects.toThrow();
    });

    test('returns false when file does not exist', async () => {
      const result = await deleteFile('/non/existent/file.txt');
      expect(result).toBe(false);
    });
  });

  describe('createUploadDirs()', () => {
    test('completes without throwing', async () => {
      await expect(createUploadDirs()).resolves.not.toThrow();
    });
  });
});

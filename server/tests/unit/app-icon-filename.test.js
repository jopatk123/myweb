import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { ValidationError } from '../../src/utils/errors.js';
import {
  sanitizeIconFilename,
  resolveIconFilePath,
  assertIconFileOnDisk,
  extensionForFormat,
  renameIconToMatchFormat,
} from '../../src/utils/app-icon-filename.js';

describe('app-icon-filename', () => {
  test('sanitizeIconFilename accepts uuid names and rejects traversal', () => {
    expect(
      sanitizeIconFilename('a1b2c3d4-e5f6-7890-abcd-ef1234567890.png')
    ).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890.png');
    expect(() => sanitizeIconFilename('../etc/passwd')).toThrow(
      ValidationError
    );
    expect(() => sanitizeIconFilename('foo/bar.png')).toThrow(ValidationError);
    expect(() => sanitizeIconFilename('')).toThrow(ValidationError);
  });

  test('resolveIconFilePath stays inside uploads dir', () => {
    const root = '/tmp/icons';
    const { filePath, filename } = resolveIconFilePath(root, 'icon.webp');
    expect(filename).toBe('icon.webp');
    expect(filePath).toBe(path.resolve(root, 'icon.webp'));
  });

  test('assertIconFileOnDisk throws when missing', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'icon-fn-'));
    await expect(assertIconFileOnDisk(dir, 'missing.png')).rejects.toThrow(
      ValidationError
    );
    await fs.writeFile(path.join(dir, 'ok.png'), 'x');
    await expect(assertIconFileOnDisk(dir, 'ok.png')).resolves.toMatchObject({
      filename: 'ok.png',
    });
    await fs.rm(dir, { recursive: true, force: true });
  });

  test('extensionForFormat normalizes jpeg to .jpg', () => {
    expect(extensionForFormat('jpeg')).toBe('.jpg');
    expect(extensionForFormat('png')).toBe('.png');
  });

  test('renameIconToMatchFormat changes extension when needed', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'icon-rename-'));
    const src = path.join(dir, 'a.jpg');
    await fs.writeFile(src, 'png-bytes');
    const next = await renameIconToMatchFormat(src, 'a.jpg', 'png');
    expect(next).toBe('a.png');
    await expect(fs.access(path.join(dir, 'a.png'))).resolves.toBeUndefined();
    await fs.rm(dir, { recursive: true, force: true });
  });
});

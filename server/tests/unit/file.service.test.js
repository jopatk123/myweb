import { jest } from '@jest/globals';
import fs from 'fs/promises';
import { FileService } from '../../src/services/file.service.js';
import { createTestDatabase, closeTestDatabase } from '../helpers/test-db.js';

let db;
let service;

beforeAll(async () => {
  db = await createTestDatabase();
  service = new FileService(db);
});

afterAll(() => {
  closeTestDatabase(db);
});

afterEach(() => {
  db.prepare('DELETE FROM files').run();
  jest.restoreAllMocks();
});

describe('FileService.create()', () => {
  test('uses relative path as url when baseUrl is empty', () => {
    const row = service.create({
      originalName: 'plain.txt',
      storedName: 'plain-1.txt',
      filePath: 'uploads/files/plain-1.txt',
      mimeType: 'text/plain',
      fileSize: 10,
      uploaderId: 'u1',
      baseUrl: '',
    });

    expect(row.file_url).toBe('uploads/files/plain-1.txt');
  });

  test('builds absolute url with valid http baseUrl', () => {
    const row = service.create({
      originalName: 'photo.jpg',
      storedName: 'photo-1.jpg',
      filePath: 'uploads/files/photo-1.jpg',
      mimeType: 'image/jpeg',
      fileSize: 22,
      uploaderId: 'u2',
      baseUrl: 'http://localhost:3000/',
    });

    expect(row.file_url).toBe(
      'http://localhost:3000/uploads/files/photo-1.jpg'
    );
  });

  test('falls back to string concat for non-http baseUrl', () => {
    const row = service.create({
      originalName: 'doc.pdf',
      storedName: 'doc-1.pdf',
      filePath: 'uploads/files/doc-1.pdf',
      mimeType: 'application/pdf',
      fileSize: 33,
      uploaderId: 'u3',
      baseUrl: 'api-base',
    });

    expect(row.file_url).toBe('api-base/uploads/files/doc-1.pdf');
  });

  test('falls back to string concat for invalid http-like baseUrl', () => {
    const row = service.create({
      originalName: 'movie.mp4',
      storedName: 'movie-1.mp4',
      filePath: 'uploads/files/movie-1.mp4',
      mimeType: 'video/mp4',
      fileSize: 44,
      uploaderId: 'u4',
      baseUrl: 'http://[bad-host',
    });

    expect(row.file_url).toBe('http://[bad-host/uploads/files/movie-1.mp4');
  });
});

describe('FileService.remove()', () => {
  test('skips disk cleanup when stored path is outside uploads root', async () => {
    const row = service.create({
      originalName: 'bad.txt',
      storedName: 'bad-1.txt',
      filePath: '/etc/passwd',
      mimeType: 'text/plain',
      fileSize: 1,
      uploaderId: 'u5',
    });

    const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);
    const result = await service.remove(row.id);

    expect(result).toBe(true);
    expect(unlinkSpy).not.toHaveBeenCalled();
  });

  test('soft deletes DB record first, then cleans disk file', async () => {
    const row = service.create({
      originalName: 'order.txt',
      storedName: 'order-1.txt',
      filePath: 'uploads/files/order-1.txt',
      mimeType: 'text/plain',
      fileSize: 1,
      uploaderId: 'u7',
    });

    const callOrder = [];
    const unlinkSpy = jest.spyOn(fs, 'unlink').mockImplementation(async () => {
      callOrder.push('unlink');
    });
    const softDeleteSpy = jest
      .spyOn(service.model, 'softDelete')
      .mockImplementation(() => {
        callOrder.push('softDelete');
        return { changes: 1 };
      });

    await service.remove(row.id);

    // 软删除先发生（同步），磁盘清理随后（异步）
    expect(callOrder).toEqual(['softDelete', 'unlink']);

    unlinkSpy.mockRestore();
    softDeleteSpy.mockRestore();
  });

  test('completes soft delete even when disk cleanup fails', async () => {
    const row = service.create({
      originalName: 'io.txt',
      storedName: 'io-1.txt',
      filePath: 'uploads/files/io-1.txt',
      mimeType: 'text/plain',
      fileSize: 1,
      uploaderId: 'u6',
    });

    // 磁盘清理失败（非 ENOENT），软删除仍应完成
    const unlinkSpy = jest
      .spyOn(fs, 'unlink')
      .mockRejectedValueOnce(
        Object.assign(new Error('permission denied'), { code: 'EACCES' })
      );

    const result = await service.remove(row.id);

    expect(result).toBe(true);
    expect(unlinkSpy).toHaveBeenCalled();

    // 软删除已生效：默认查询应抛 NotFoundError
    expect(() => service.get(row.id)).toThrow('文件不存在');
    // 但 includeDeleted 查询应能拿到（保留记录便于审计/重试）
    const softDeleted = service.model.findById(row.id, {
      includeDeleted: true,
    });
    expect(softDeleted).toBeTruthy();
    expect(softDeleted.deleted_at).not.toBeNull();
  });

  test('returns true without re-cleaning when file is already soft-deleted', async () => {
    const row = service.create({
      originalName: 'twice.txt',
      storedName: 'twice-1.txt',
      filePath: 'uploads/files/twice-1.txt',
      mimeType: 'text/plain',
      fileSize: 1,
      uploaderId: 'u8',
    });

    await service.remove(row.id);

    // 第二次删除：不应再次触发磁盘清理，且应幂等返回 true
    const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);
    const result = await service.remove(row.id);

    expect(result).toBe(true);
    expect(unlinkSpy).not.toHaveBeenCalled();
    unlinkSpy.mockRestore();
  });

  test('ignores ENOENT during disk cleanup (file already gone)', async () => {
    const row = service.create({
      originalName: 'ghost.txt',
      storedName: 'ghost-1.txt',
      filePath: 'uploads/files/ghost-1.txt',
      mimeType: 'text/plain',
      fileSize: 1,
      uploaderId: 'u9',
    });

    const unlinkSpy = jest
      .spyOn(fs, 'unlink')
      .mockRejectedValueOnce(
        Object.assign(new Error('not found'), { code: 'ENOENT' })
      );

    const result = await service.remove(row.id);

    expect(result).toBe(true);
    expect(unlinkSpy).toHaveBeenCalled();
    unlinkSpy.mockRestore();
  });
});

describe('FileService.get()', () => {
  test('throws NotFoundError when file does not exist', () => {
    expect(() => service.get(999999)).toThrow('文件不存在');
    expect(() => service.get(999999)).toThrow(
      expect.objectContaining({ status: 404 })
    );
  });

  test('returns the row when file exists', () => {
    const row = service.create({
      originalName: 'get-test.txt',
      storedName: 'get-test-1.txt',
      filePath: 'uploads/files/get-test-1.txt',
      mimeType: 'text/plain',
      fileSize: 1,
      uploaderId: 'u-get',
    });

    const result = service.get(row.id);
    expect(result).toBeTruthy();
    expect(result.id).toBe(row.id);
  });
});

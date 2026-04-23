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
  test('returns true when stored path is outside uploads root', async () => {
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

  test('ignores non-ENOENT unlink errors and still returns true', async () => {
    const row = service.create({
      originalName: 'io.txt',
      storedName: 'io-1.txt',
      filePath: 'uploads/files/io-1.txt',
      mimeType: 'text/plain',
      fileSize: 1,
      uploaderId: 'u6',
    });

    const unlinkSpy = jest
      .spyOn(fs, 'unlink')
      .mockRejectedValueOnce(
        Object.assign(new Error('permission denied'), { code: 'EACCES' })
      );

    const result = await service.remove(row.id);
    expect(result).toBe(true);
    expect(unlinkSpy).toHaveBeenCalled();
  });

  test('deletes disk file before DB record to prevent orphaned files', async () => {
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
    const modelDeleteSpy = jest
      .spyOn(service.model, 'delete')
      .mockImplementation(() => {
        callOrder.push('dbDelete');
      });

    await service.remove(row.id);

    expect(callOrder).toEqual(['unlink', 'dbDelete']);

    unlinkSpy.mockRestore();
    modelDeleteSpy.mockRestore();
  });
});

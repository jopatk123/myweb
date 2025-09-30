/* eslint-env jest */
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { MusicService } from '../src/services/music.service.js';
import { createTestDatabase, closeTestDatabase } from './helpers/test-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads/music');

function createDummyFile(name, content = 'dummy audio content') {
  const filePath = path.join(uploadsDir, name);
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('MusicService integration', () => {
  let db;
  let service;

  beforeAll(async () => {
    db = await createTestDatabase();
    service = new MusicService(db);
  });

  afterAll(async () => {
    await closeTestDatabase(db);
  });

  afterEach(async () => {
    db.prepare('DELETE FROM music_tracks').run();
    db.prepare('DELETE FROM files').run();
    if (fs.existsSync(uploadsDir)) {
      const files = await fsPromises.readdir(uploadsDir);
      await Promise.all(
        files.map(file =>
          fsPromises.unlink(path.join(uploadsDir, file)).catch(() => null)
        )
      );
    }
  });

  test('createTrackFromUpload stores metadata and file reference', async () => {
    const filename = `${Date.now()}-sample.mp3`;
    createDummyFile(filename);

    const payload = {
      originalname: 'lofi.mp3',
      filename,
      mimetype: 'audio/mpeg',
      size: 1024,
    };

    const { fileRow, trackRow } = await service.createTrackFromUpload(payload);

    expect(fileRow).toBeTruthy();
    expect(trackRow).toBeTruthy();
    expect(trackRow.file_id).toBe(fileRow.id);
    expect(trackRow.title).toBeTruthy();
    expect(trackRow.file_path).toContain(filename);

    const list = service.list();
    expect(list.total).toBe(1);
    expect(list.items[0].id).toBe(trackRow.id);
  });

  test('updateTrack allows editing title and artist', async () => {
    const filename = `${Date.now()}-edit.mp3`;
    createDummyFile(filename);

    const payload = {
      originalname: 'ambient.mp3',
      filename,
      mimetype: 'audio/mpeg',
      size: 2048,
    };

    const { trackRow } = await service.createTrackFromUpload(payload);

    const updated = service.updateTrack(trackRow.id, {
      title: '全新标题',
      artist: '测试歌手',
      album: '测试专辑',
    });

    expect(updated.title).toBe('全新标题');
    expect(updated.artist).toBe('测试歌手');
    expect(updated.album).toBe('测试专辑');
  });

  test('deleteTrack removes file model and music track and underlying file', async () => {
    const filename = `${Date.now()}-delete.mp3`;
    const filePath = createDummyFile(filename, 'temporary audio');

    const payload = {
      originalname: 'temp.mp3',
      filename,
      mimetype: 'audio/mpeg',
      size: 512,
    };

    const { trackRow } = await service.createTrackFromUpload(payload);

    await service.deleteTrack(trackRow.id);

    const list = service.list();
    expect(list.total).toBe(0);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});

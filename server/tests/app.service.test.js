/* eslint-env jest */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTestDatabase, closeTestDatabase } from './helpers/test-db.js';
import { AppService } from '../src/services/app.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempRoot = path.join(__dirname, 'tmp-app-service');

let db;
let service;

beforeAll(async () => {
  db = await createTestDatabase();
  service = new AppService(db);
});

afterAll(() => {
  closeTestDatabase(db);
});

beforeEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
  await fs.mkdir(tempRoot, { recursive: true });

  service.uploadsDir = path.join(tempRoot, 'uploads');
  service.publicIconsDir = path.join(tempRoot, 'public');
  service.presetIconsDir = path.join(tempRoot, 'preset');

  await fs.mkdir(service.uploadsDir, { recursive: true });
  await fs.mkdir(service.publicIconsDir, { recursive: true });
  await fs.mkdir(service.presetIconsDir, { recursive: true });

  db.prepare('DELETE FROM apps').run();
});

test('deleteApp throws 404 when app does not exist', async () => {
  await expect(service.deleteApp(9999)).rejects.toMatchObject({
    message: '应用不存在',
    status: 404,
  });
});

test('deleteApp rejects deletion for builtin apps', async () => {
  const created = service.appModel.create({
    name: '内置应用',
    slug: 'builtin-app',
    description: null,
    icon_filename: null,
    group_id: null,
    is_visible: 1,
    is_autostart: 0,
    is_builtin: 1,
    target_url: null,
  });

  await expect(service.deleteApp(created.id)).rejects.toMatchObject({
    message: '内置应用不允许删除',
    status: 400,
  });
});

test('deleteApp removes icon file when no other references exist', async () => {
  const iconFilename = 'app-icon.png';
  const iconPath = path.join(service.uploadsDir, iconFilename);
  await fs.writeFile(iconPath, 'mock-content');

  const app = await service.createApp({
    name: '测试应用',
    slug: 'test-app',
    iconFilename,
    description: 'desc',
  });

  const result = await service.deleteApp(app.id);
  expect(result).toBe(true);
  await expect(fs.access(iconPath)).rejects.toThrow();
});

test('copyPresetIcon copies from public icons directory', async () => {
  const sourceIcon = path.join(service.publicIconsDir, 'preset.svg');
  await fs.writeFile(sourceIcon, '<svg></svg>');

  const newFilename = await service.copyPresetIcon('preset.svg');
  expect(newFilename).toMatch(/\.svg$/);
  const copiedPath = path.join(service.uploadsDir, newFilename);
  const stat = await fs.stat(copiedPath);
  expect(stat.isFile()).toBe(true);
});

test('copyPresetIcon throws when icon missing', async () => {
  await expect(service.copyPresetIcon('missing.svg')).rejects.toThrow(
    '预选图标文件不存在: missing.svg'
  );
});

test('deleteIconFileIfExists handles existing and missing files', async () => {
  const filePath = path.join(service.uploadsDir, 'to-remove.png');
  await fs.writeFile(filePath, 'test');

  await expect(service.deleteIconFileIfExists('to-remove.png')).resolves.toBe(
    true
  );
  await expect(service.deleteIconFileIfExists('to-remove.png')).resolves.toBe(
    false
  );
});

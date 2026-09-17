import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { copyPresetAppIcon } from '../../src/utils/app-icon-storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempRoot = path.join(__dirname, '../tmp-app-icon-storage');

async function setupDirs() {
  await fs.rm(tempRoot, { recursive: true, force: true });
  const uploadsDir = path.join(tempRoot, 'uploads');
  const publicIconsDir = path.join(tempRoot, 'public');
  const distIconsDir = path.join(tempRoot, 'dist');
  const presetIconsDir = path.join(tempRoot, 'preset');
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(publicIconsDir, { recursive: true });
  await fs.mkdir(distIconsDir, { recursive: true });
  await fs.mkdir(presetIconsDir, { recursive: true });
  return { uploadsDir, publicIconsDir, distIconsDir, presetIconsDir };
}

beforeEach(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

test('copyPresetAppIcon resolves icon from dist when public is empty (Docker layout)', async () => {
  const dirs = await setupDirs();
  await fs.writeFile(path.join(dirs.distIconsDir, 'github.svg'), '<svg></svg>');

  const filename = await copyPresetAppIcon({
    ...dirs,
    presetIconFilename: 'github.svg',
  });

  expect(filename).toMatch(/^[0-9a-f-]+\.svg$/i);
  await expect(
    fs.access(path.join(dirs.uploadsDir, filename))
  ).resolves.toBeUndefined();
});

test('copyPresetAppIcon prefers public over dist when both exist', async () => {
  const dirs = await setupDirs();
  await fs.writeFile(
    path.join(dirs.publicIconsDir, 'icon.svg'),
    'public-version'
  );
  await fs.writeFile(path.join(dirs.distIconsDir, 'icon.svg'), 'dist-version');

  const filename = await copyPresetAppIcon({
    ...dirs,
    presetIconFilename: 'icon.svg',
  });
  const copied = await fs.readFile(
    path.join(dirs.uploadsDir, filename),
    'utf8'
  );
  expect(copied).toBe('public-version');
});

test('copyPresetAppIcon throws ValidationError when preset is missing', async () => {
  const dirs = await setupDirs();

  await expect(
    copyPresetAppIcon({
      ...dirs,
      presetIconFilename: 'missing.svg',
    })
  ).rejects.toMatchObject({
    status: 400,
    message: '预选图标不存在: missing.svg',
  });
});

test('copyPresetAppIcon does not read from uploadsDir (Q2 regression)', async () => {
  const dirs = await setupDirs();
  await fs.writeFile(
    path.join(dirs.uploadsDir, 'user-upload.svg'),
    '<svg></svg>'
  );

  await expect(
    copyPresetAppIcon({
      ...dirs,
      presetIconFilename: 'user-upload.svg',
    })
  ).rejects.toMatchObject({ status: 400 });
});

test('copyPresetAppIcon strips path segments from preset filename', async () => {
  const dirs = await setupDirs();
  await fs.writeFile(path.join(dirs.distIconsDir, 'safe.svg'), '<svg></svg>');

  const filename = await copyPresetAppIcon({
    ...dirs,
    presetIconFilename: '../../etc/safe.svg',
  });

  expect(filename).toMatch(/\.svg$/);
});

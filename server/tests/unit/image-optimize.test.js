import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import {
  optimizeIconFile,
  finalizeUploadedIcon,
} from '../../src/utils/image-optimize.js';

/** 生成带透明背景的大尺寸 PNG（模拟典型上传图标） */
async function createLargeAlphaPng(filePath) {
  const width = 1024;
  const height = 1024;
  const raw = Buffer.alloc(width * height * 4);
  // 左上 3/4 区域为半透明彩色，右下 1/4 完全透明
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (x < (width * 3) / 4 && y < (height * 3) / 4) {
        raw[i] = (x * 255) / width;
        raw[i + 1] = (y * 255) / height;
        raw[i + 2] = 128;
        raw[i + 3] = 200;
      }
      // 其余像素保持 0（完全透明）
    }
  }
  await sharp(raw, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 0 }) // 故意不压缩，模拟体积异常的上传
    .toFile(filePath);
}

/** 生成大尺寸不透明 JPEG */
async function createLargeJpeg(filePath) {
  await sharp({
    create: {
      width: 1024,
      height: 768,
      channels: 3,
      background: { r: 120, g: 40, b: 200 },
    },
  })
    .jpeg({ quality: 100 })
    .toFile(filePath);
}

/** 生成小尺寸 GIF（应被跳过，保持原样） */
async function createGif(filePath) {
  await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 0, g: 128, b: 255, alpha: 0.5 },
    },
  })
    .gif()
    .toFile(filePath);
}

describe('optimizeIconFile', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'icon-optimize-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('压缩大尺寸透明 PNG：保持 PNG 格式、缩至 256px、透明通道无损保留', async () => {
    const filePath = path.join(tmpDir, 'alpha-icon.png');
    await createLargeAlphaPng(filePath);
    const beforeSize = (await fs.stat(filePath)).size;

    const result = await optimizeIconFile(filePath);

    expect(result.optimized).toBe(true);
    const afterSize = (await fs.stat(filePath)).size;
    expect(afterSize).toBeLessThan(beforeSize);

    const meta = await sharp(filePath).metadata();
    expect(meta.format).toBe('png');
    expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(256);
    expect(meta.hasAlpha).toBe(true);

    const stats = await sharp(filePath).stats();
    expect(stats.isOpaque).toBe(false); // 透明区域真实存在
  });

  test('压缩大尺寸 JPEG：保持 JPEG 格式并缩至 256px', async () => {
    const filePath = path.join(tmpDir, 'photo-icon.jpg');
    await createLargeJpeg(filePath);
    const beforeSize = (await fs.stat(filePath)).size;

    const result = await optimizeIconFile(filePath);

    expect(result.optimized).toBe(true);
    const afterSize = (await fs.stat(filePath)).size;
    expect(afterSize).toBeLessThan(beforeSize);

    const meta = await sharp(filePath).metadata();
    expect(meta.format).toBe('jpeg');
    expect(Math.max(meta.width, meta.height)).toBeLessThanOrEqual(256);
  });

  test('GIF 输入被跳过：文件原样保留', async () => {
    const filePath = path.join(tmpDir, 'anim.gif');
    await createGif(filePath);
    const before = await fs.readFile(filePath);

    const result = await optimizeIconFile(filePath);

    expect(result.optimized).toBe(false);
    expect(result.reason).toBe('skip-format');
    const after = await fs.readFile(filePath);
    expect(after.equals(before)).toBe(true);
  });

  test('AVIF 转为 PNG 并保留透明', async () => {
    const filePath = path.join(tmpDir, 'icon.avif');
    await sharp({
      create: {
        width: 320,
        height: 320,
        channels: 4,
        background: { r: 10, g: 80, b: 200, alpha: 0.4 },
      },
    })
      .avif({ quality: 50 })
      .toFile(filePath);

    const result = await optimizeIconFile(filePath);

    expect(result.optimized).toBe(true);
    expect(result.outputFormat).toBe('png');
    const meta = await sharp(filePath).metadata();
    expect(meta.format).toBe('png');
    expect(meta.hasAlpha).toBe(true);
  });

  test('finalizeUploadedIcon 将 PNG 内容的 .jpg 文件改名为 .png', async () => {
    const filePath = path.join(tmpDir, 'misnamed.jpg');
    await createLargeAlphaPng(filePath);

    const result = await finalizeUploadedIcon(
      filePath,
      'misnamed.jpg',
      'image/png'
    );

    expect(result.filename).toBe('misnamed.png');
    await expect(
      fs.access(path.join(tmpDir, 'misnamed.png'))
    ).resolves.toBeUndefined();
    await expect(fs.access(filePath)).rejects.toThrow();
  });
});

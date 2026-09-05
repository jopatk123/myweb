import fs from 'fs/promises';
import sharp from 'sharp';
import {
  formatFromMime,
  renameIconToMatchFormat,
} from './app-icon-filename.js';

// 桌面图标显示尺寸 64px，256px 已含 retina 高分屏余量
const ICON_MAX_DIMENSION = 256;

// GIF 可能为动图、ICO 为多尺寸容器：重编码会丢失信息，原样保留。
// BMP/TIFF 极少见且 sharp 不支持 BMP 输出（转换会破坏扩展名一致性），同样跳过。
// SVG 为矢量，栅格化会丢失可缩放性，原样保留。
const SKIP_FORMATS = new Set(['gif', 'ico', 'bmp', 'tiff', 'svg']);

// 浏览器作桌面 <img> 时 AVIF/HEIC 支持不齐，转 PNG 并改扩展名
const RASTERIZE_TO_PNG = new Set(['avif', 'heif', 'heic']);

async function encodePngPreferSmaller(resized) {
  const paletteBuf = await resized
    .clone()
    .png({ palette: true, quality: 95, compressionLevel: 9 })
    .toBuffer();
  const rgbaBuf = await resized.clone().png({ compressionLevel: 9 }).toBuffer();
  return paletteBuf.length <= rgbaBuf.length ? paletteBuf : rgbaBuf;
}

async function writeFileAtomic(filePath, buffer) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmpPath, buffer);
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    await fs.unlink(tmpPath).catch(() => {});
    throw error;
  }
}

/**
 * 就地优化应用图标文件（上传链路调用）：
 * - 应用 EXIF 方向
 * - 等比缩至最大边 256px（withoutEnlargement：小图不放大）
 * - PNG/JPEG/WebP 保持原格式重编码；AVIF/HEIC 转为 PNG
 * - 仅当压缩后更小，或输出格式必须改变时，才替换原文件
 *
 * @param {string} filePath multer 落盘的图标绝对路径
 * @returns {Promise<{optimized: boolean, reason?: string, originalSize?: number, newSize?: number, outputFormat?: string}>}
 */
export async function optimizeIconFile(filePath) {
  const metadata = await sharp(filePath, { failOn: 'none' }).metadata();
  const inputFormat = metadata.format || null;

  if (!inputFormat || SKIP_FORMATS.has(inputFormat)) {
    return {
      optimized: false,
      reason: 'skip-format',
      outputFormat: inputFormat,
    };
  }

  const image = sharp(filePath, { failOn: 'none' }).rotate();
  const resized = image.resize(ICON_MAX_DIMENSION, ICON_MAX_DIMENSION, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  let buffer;
  let outputFormat = inputFormat;
  if (inputFormat === 'jpeg') {
    buffer = await resized
      .clone()
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } else if (inputFormat === 'webp') {
    buffer = await resized.clone().webp({ quality: 85 }).toBuffer();
  } else if (RASTERIZE_TO_PNG.has(inputFormat) || inputFormat === 'png') {
    buffer = await encodePngPreferSmaller(resized);
    outputFormat = 'png';
  } else {
    buffer = await encodePngPreferSmaller(resized);
    outputFormat = 'png';
  }

  const { size: originalSize } = await fs.stat(filePath);
  const formatChanged = outputFormat !== inputFormat;
  if (!formatChanged && buffer.length >= originalSize) {
    return { optimized: false, reason: 'no-gain', originalSize, outputFormat };
  }

  await writeFileAtomic(filePath, buffer);
  return {
    optimized: true,
    originalSize,
    newSize: buffer.length,
    outputFormat,
  };
}

/**
 * 压缩（失败保留原图）并把扩展名改成与内容格式一致。
 * @returns {Promise<{filename: string, optimized: boolean, outputFormat?: string}>}
 */
export async function finalizeUploadedIcon(filePath, filename, detectedMime) {
  let outputFormat = formatFromMime(detectedMime);
  let optimized = false;
  let originalSize;
  let newSize;
  let optimizeError;

  try {
    const result = await optimizeIconFile(filePath);
    optimized = Boolean(result.optimized);
    originalSize = result.originalSize;
    newSize = result.newSize;
    if (result.outputFormat) {
      outputFormat = result.outputFormat;
    }
  } catch (error) {
    optimizeError = error?.message || String(error);
  }

  const finalFilename = await renameIconToMatchFormat(
    filePath,
    filename,
    outputFormat
  );

  return {
    filename: finalFilename,
    optimized,
    outputFormat,
    originalSize,
    newSize,
    optimizeError,
  };
}

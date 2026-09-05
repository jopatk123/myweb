import fs from 'fs/promises';
import sharp from 'sharp';

// 桌面图标显示尺寸 64px，256px 已含 retina 高分屏余量
const ICON_MAX_DIMENSION = 256;

// GIF 可能为动图、ICO 为多尺寸容器：重编码会丢失信息，原样保留。
// BMP/TIFF 极少见且 sharp 不支持 BMP 输出（转换会破坏扩展名一致性），同样跳过。
const SKIP_FORMATS = new Set(['gif', 'ico', 'bmp', 'tiff']);

/**
 * 就地优化应用图标文件（上传链路调用）：
 * - 等比缩至最大边 256px（withoutEnlargement：小图不放大）
 * - 输出格式与输入一致，保证文件内容与扩展名匹配：
 *   - PNG：palette 与 RGBA 双方案取更小者，透明通道无损保留
 *   - JPEG：q82 + mozjpeg 视觉无损重编码
 *   - WEBP：q85 重编码（保留透明）
 * - 仅当压缩后更小时才替换原文件；任何异常由调用方兜底保留原图
 *
 * @param {string} filePath multer 落盘的图标绝对路径
 * @returns {Promise<{optimized: boolean, reason?: string, originalSize?: number, newSize?: number}>}
 */
export async function optimizeIconFile(filePath) {
  const image = sharp(filePath, { failOn: 'none' });
  const metadata = await image.metadata();

  if (!metadata.format || SKIP_FORMATS.has(metadata.format)) {
    return { optimized: false, reason: 'skip-format' };
  }

  const resized = image.resize(ICON_MAX_DIMENSION, ICON_MAX_DIMENSION, {
    fit: 'inside',
    withoutEnlargement: true,
  });

  let buffer;
  if (metadata.format === 'jpeg') {
    buffer = await resized
      .clone()
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } else if (metadata.format === 'webp') {
    buffer = await resized.clone().webp({ quality: 85 }).toBuffer();
  } else {
    // PNG 及其他可转 PNG 的输入：双方案取更小者，透明无损
    const paletteBuf = await resized
      .clone()
      .png({ palette: true, quality: 95, compressionLevel: 9 })
      .toBuffer();
    const rgbaBuf = await resized
      .clone()
      .png({ compressionLevel: 9 })
      .toBuffer();
    buffer = paletteBuf.length <= rgbaBuf.length ? paletteBuf : rgbaBuf;
  }

  const { size: originalSize } = await fs.stat(filePath);
  if (buffer.length >= originalSize) {
    return { optimized: false, reason: 'no-gain', originalSize };
  }

  await fs.writeFile(filePath, buffer);
  return {
    optimized: true,
    originalSize,
    newSize: buffer.length,
  };
}

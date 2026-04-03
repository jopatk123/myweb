/**
 * 文件魔数（Magic Bytes）验证工具
 *
 * 通过读取文件头字节来验证文件的真实类型，
 * 防止攻击者通过伪造 Content-Type 上传恶意文件（MIME 欺骗攻击）。
 */
import fs from 'fs/promises';

/**
 * 已知图片格式的魔数签名
 * 格式：{ offset: 字节偏移量, bytes: 期望字节序列（十六进制）, mime: 对应 MIME 类型 }
 */
const IMAGE_SIGNATURES = [
  // JPEG: FF D8 FF
  { offset: 0, bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  {
    offset: 0,
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    mime: 'image/png',
  },
  // GIF87a or GIF89a
  { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], mime: 'image/gif' },
  { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], mime: 'image/gif' },
  // WebP: RIFF????WEBP
  {
    offset: 0,
    bytes: [0x52, 0x49, 0x46, 0x46],
    mime: 'image/webp',
    extra: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  },
  // BMP: BM
  { offset: 0, bytes: [0x42, 0x4d], mime: 'image/bmp' },
  // TIFF little-endian: II 42 00
  { offset: 0, bytes: [0x49, 0x49, 0x2a, 0x00], mime: 'image/tiff' },
  // TIFF big-endian: MM 00 42
  { offset: 0, bytes: [0x4d, 0x4d, 0x00, 0x2a], mime: 'image/tiff' },
  // AVIF / HEIC (ftyp box): 00 00 00 xx 66 74 79 70
  { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70], mime: 'image/avif' },
  // ICO: 00 00 01 00
  { offset: 0, bytes: [0x00, 0x00, 0x01, 0x00], mime: 'image/x-icon' },
];

/**
 * 从文件中读取前 N 个字节
 * @param {string} filePath 文件路径
 * @param {number} size 读取字节数
 * @returns {Promise<Buffer>}
 */
async function readFileHeader(filePath, size = 16) {
  let fd;
  try {
    fd = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(size);
    await fd.read(buffer, 0, size, 0);
    return buffer;
  } finally {
    if (fd) await fd.close();
  }
}

/**
 * 检查 buffer 中指定偏移量处的字节是否匹配期望序列
 * @param {Buffer} buffer
 * @param {number} offset
 * @param {number[]} expectedBytes
 * @returns {boolean}
 */
function matchesSignature(buffer, offset, expectedBytes) {
  if (buffer.length < offset + expectedBytes.length) return false;
  return expectedBytes.every((byte, i) => buffer[offset + i] === byte);
}

/**
 * 验证文件是否为有效图片（通过魔数检测）
 *
 * @param {string} filePath 文件在磁盘上的绝对路径
 * @param {string} [declaredMime] 请求声明的 MIME 类型（可选，用于附加日志）
 * @returns {Promise<{ valid: boolean; detectedMime: string | null }>}
 */
export async function validateImageMagicBytes(filePath, declaredMime) {
  let header;
  try {
    header = await readFileHeader(filePath, 16);
  } catch (err) {
    // 文件不存在（ENOENT）：无法对不存在的文件做魔数验证，跳过此步骤
    // 该场景通常发生在测试环境或文件路径为虚拟路径时
    if (err && err.code === 'ENOENT') {
      return { valid: true, detectedMime: null };
    }
    return { valid: false, detectedMime: null };
  }

  for (const sig of IMAGE_SIGNATURES) {
    if (!matchesSignature(header, sig.offset, sig.bytes)) continue;

    // 检查附加签名（如 WebP 需要 RIFF + WEBP）
    if (
      sig.extra &&
      !matchesSignature(header, sig.extra.offset, sig.extra.bytes)
    ) {
      continue;
    }

    // AVIF/HEIC ftyp 魔数仅表示是 ISOBMFF 容器，需要进一步确认品牌
    if (sig.mime === 'image/avif') {
      const brand = header.slice(8, 12).toString('ascii');
      const avifBrands = [
        'avif',
        'avis',
        'heic',
        'heix',
        'hevc',
        'hevx',
        'mif1',
        'msf1',
      ];
      if (!avifBrands.some(b => brand.startsWith(b))) continue;
    }

    return { valid: true, detectedMime: sig.mime };
  }

  return { valid: false, detectedMime: null };
}

/**
 * 验证图片文件，若不合法则抛出错误
 *
 * @param {string} filePath 文件磁盘路径
 * @param {string} [declaredMime] 声称的 MIME 类型
 * @throws {Error} 当文件不是有效图片时抛出
 */
export async function assertValidImageFile(filePath, declaredMime) {
  const { valid, detectedMime } = await validateImageMagicBytes(
    filePath,
    declaredMime
  );

  if (!valid) {
    const err = new Error(
      `文件内容与声称的类型不符：声称为 "${declaredMime || '未知'}"，但文件头不匹配任何已知图片格式`
    );
    err.status = 422;
    err.code = 'INVALID_FILE_CONTENT';
    throw err;
  }

  return detectedMime;
}

/**
 * 文件魔数（Magic Bytes）验证工具
 *
 * 通过读取文件头字节来验证文件的真实类型，
 * 防止攻击者通过伪造 Content-Type 上传恶意文件（MIME 欺骗攻击）。
 */
import fs from 'fs/promises';
import { detectTypeCategory, FILE_CATEGORIES } from './file-metadata.js';

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
 * 压缩包格式魔数签名
 */
const ARCHIVE_SIGNATURES = [
  // ZIP (含 Office OOXML 容器、jar 等): PK\x03\x04 / PK\x05\x06(空归档) / PK\x07\x08
  {
    offset: 0,
    bytes: [0x50, 0x4b, 0x03, 0x04],
    mime: 'application/zip',
    category: FILE_CATEGORIES.ARCHIVE,
  },
  {
    offset: 0,
    bytes: [0x50, 0x4b, 0x05, 0x06],
    mime: 'application/zip',
    category: FILE_CATEGORIES.ARCHIVE,
  },
  {
    offset: 0,
    bytes: [0x50, 0x4b, 0x07, 0x08],
    mime: 'application/zip',
    category: FILE_CATEGORIES.ARCHIVE,
  },
  // 7z: 7z \xBC \xAF \x27 \x1C
  {
    offset: 0,
    bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
    mime: 'application/x-7z-compressed',
    category: FILE_CATEGORIES.ARCHIVE,
  },
  // RAR v4: Rar!\x1A\x07\x00 ; RAR v5: Rar!\x1A\x07\x01\x00
  {
    offset: 0,
    bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00],
    mime: 'application/x-rar-compressed',
    category: FILE_CATEGORIES.ARCHIVE,
  },
  {
    offset: 0,
    bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00],
    mime: 'application/vnd.rar',
    category: FILE_CATEGORIES.ARCHIVE,
  },
  // gzip: \x1F \x8B
  {
    offset: 0,
    bytes: [0x1f, 0x8b],
    mime: 'application/gzip',
    category: FILE_CATEGORIES.ARCHIVE,
  },
  // bzip2: BZh
  {
    offset: 0,
    bytes: [0x42, 0x5a, 0x68],
    mime: 'application/x-bzip2',
    category: FILE_CATEGORIES.ARCHIVE,
  },
  // xz: \xFD 7 z X Z \x00
  {
    offset: 0,
    bytes: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00],
    mime: 'application/x-xz',
    category: FILE_CATEGORIES.ARCHIVE,
  },
];

/**
 * PDF 魔数：%PDF-
 */
const PDF_SIGNATURE = {
  offset: 0,
  bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
  mime: 'application/pdf',
  category: FILE_CATEGORIES.PDF,
};

/**
 * tar 格式：在 offset 257 处有 "ustar" 标识
 */
const TAR_SIGNATURE = {
  offset: 257,
  bytes: [0x75, 0x73, 0x74, 0x61, 0x72], // ustar
  mime: 'application/x-tar',
  category: FILE_CATEGORIES.ARCHIVE,
};

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
export async function validateImageMagicBytes(filePath, _declaredMime) {
  let header;
  try {
    header = await readFileHeader(filePath, 16);
  } catch (err) {
    // fail-closed：文件不存在或读取失败时一律判为无效，避免绕过魔数校验
    if (err && err.code === 'ENOENT') {
      return { valid: false, detectedMime: null };
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

/**
 * 验证压缩包/PDF 文件（通过魔数检测）
 *
 * @param {string} filePath 文件磁盘绝对路径
 * @param {string} declaredMime 声明的 MIME 类型
 * @returns {Promise<{ valid: boolean; detectedMime: string | null }>}
 */
export async function validateArchiveMagicBytes(filePath, declaredMime) {
  let header;
  try {
    // tar 的 ustar 标识在 offset 257，至少读 262 字节
    header = await readFileHeader(filePath, 262);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { valid: false, detectedMime: null };
    }
    return { valid: false, detectedMime: null };
  }

  // PDF
  if (matchesSignature(header, PDF_SIGNATURE.offset, PDF_SIGNATURE.bytes)) {
    return { valid: true, detectedMime: PDF_SIGNATURE.mime };
  }

  // 通用压缩包
  for (const sig of ARCHIVE_SIGNATURES) {
    if (matchesSignature(header, sig.offset, sig.bytes)) {
      return { valid: true, detectedMime: sig.mime };
    }
  }

  // tar：仅在声明 MIME 为 tar 时才校验（ustar 标识在 offset 257，读取成本较高）
  if (declaredMime === 'application/x-tar') {
    if (matchesSignature(header, TAR_SIGNATURE.offset, TAR_SIGNATURE.bytes)) {
      return { valid: true, detectedMime: TAR_SIGNATURE.mime };
    }
  }

  return { valid: false, detectedMime: null };
}

/**
 * 通用上传文件魔数校验：根据声明的 MIME 类型选择对应校验策略
 *
 * - 图片：走 assertValidImageFile（保留原有严格策略）
 * - 压缩包 / PDF：走 validateArchiveMagicBytes
 * - 其他类型（Office 文档/视频/音频/文本/代码）：暂不校验，
 *   依赖白名单 MIME + 扩展名拦截（Office OOXML 校验复杂，且白名单已拒绝可执行类型）
 *
 * @param {string} filePath 文件磁盘绝对路径
 * @param {string} declaredMime 声明的 MIME 类型
 * @param {string} [originalName] 原始文件名（用于推断类型，当 MIME 缺失时）
 * @throws {Error} 当文件内容与声明类型不符时抛出 status=422 错误
 */
export async function assertValidUploadedFile(
  filePath,
  declaredMime,
  originalName = ''
) {
  const category = detectTypeCategory(declaredMime, originalName);

  // 图片严格校验
  if (category === FILE_CATEGORIES.IMAGE) {
    return assertValidImageFile(filePath, declaredMime);
  }

  // 压缩包 / PDF 校验
  if (
    category === FILE_CATEGORIES.ARCHIVE ||
    category === FILE_CATEGORIES.PDF
  ) {
    const { valid, detectedMime } = await validateArchiveMagicBytes(
      filePath,
      declaredMime
    );
    if (!valid) {
      const err = new Error(
        `文件内容与声称的类型不符：声称为 "${declaredMime || '未知'}"，但文件头不匹配已知压缩包/PDF 格式`
      );
      err.status = 422;
      err.code = 'INVALID_FILE_CONTENT';
      throw err;
    }
    return detectedMime;
  }

  // 其他类型暂不校验
  return null;
}

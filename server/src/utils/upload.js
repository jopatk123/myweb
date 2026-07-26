/**
 * 上传文件名规范化工具
 *
 * multer 在某些客户端（如未设置 Content-Disposition 编码）下会把文件名按 latin1 接收，
 * 导致中文文件名变成乱码。本模块尝试将该情形下的 latin1 字节重新解释为 utf8。
 *
 * 关键约束：仅当字符串看起来像"latin1 误读 utf8 字节"时才执行转码——
 * 即字符串中所有字符码点均在 0-255 范围且包含 >= 0x80 的字符（说明含非 ASCII 字节），
 * 避免破坏合法的 latin1 文件名或正常 UTF-8 文件名。
 */

/**
 * 判断字符串是否可能是 latin1 误读 utf8 字节的结果：
 * - 字符串中至少一个字符码点 >= 0x80
 * - 所有字符码点 <= 0xFF（latin1 范围）
 */
function looksLikeMisinterpretedLatin1(str) {
  if (typeof str !== 'string' || str.length === 0) return false;
  let hasHighByte = false;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code > 0xff) return false; // 超出 latin1 范围，说明已经是正常 Unicode 字符
    if (code >= 0x80) hasHighByte = true;
  }
  return hasHighByte;
}

export function decodeUploadFilename(name) {
  if (typeof name !== 'string' || name.length === 0) {
    return name;
  }

  // 仅在疑似 latin1 误读场景下才尝试转码
  if (!looksLikeMisinterpretedLatin1(name)) {
    return name;
  }

  try {
    const buffer = Buffer.from(name, 'latin1');
    const decoded = buffer.toString('utf8');
    // 双向校验：decoded 重新按 utf8 编码应能还原为 latin1 输入，
    // 否则说明输入本身不是 latin1 编码的 utf8 字节，不应强行替换
    const reencoded = Buffer.from(decoded, 'utf8').toString('latin1');
    return reencoded === name ? decoded : name;
  } catch {
    return name;
  }
}

export function normaliseUploadedFileName(file) {
  if (!file || typeof file.originalname !== 'string') {
    return file?.originalname;
  }

  const decoded = decodeUploadFilename(file.originalname);
  if (decoded && decoded !== file.originalname) {
    file.originalname = decoded;
  }
  return file.originalname;
}

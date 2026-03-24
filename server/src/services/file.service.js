import path from 'path';
import fs from 'fs/promises';
import { FileModel } from '../models/file.model.js';
import logger from '../utils/logger.js';
import { toUploadsAbsolutePath } from '../utils/upload-path.js';

const fileServiceLogger = logger.child('FileService');

/**
 * 文件类型分类枚举
 */
const FILE_CATEGORIES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  WORD: 'word',
  EXCEL: 'excel',
  PPT: 'ppt',
  PDF: 'pdf',
  TEXT: 'text',
  CODE: 'code',
  ARCHIVE: 'archive',
  OTHER: 'other',
};

/**
 * MIME类型到文件类型分类的映射
 */
const MIME_TYPE_MAP = {
  // 图片类型
  'image/jpeg': FILE_CATEGORIES.IMAGE,
  'image/png': FILE_CATEGORIES.IMAGE,
  'image/gif': FILE_CATEGORIES.IMAGE,
  'image/webp': FILE_CATEGORIES.IMAGE,
  'image/svg+xml': FILE_CATEGORIES.IMAGE,
  'image/bmp': FILE_CATEGORIES.IMAGE,
  'image/tiff': FILE_CATEGORIES.IMAGE,
  'image/x-icon': FILE_CATEGORIES.IMAGE,
  'image/heic': FILE_CATEGORIES.IMAGE,
  'image/heif': FILE_CATEGORIES.IMAGE,
  'image/avif': FILE_CATEGORIES.IMAGE,

  // 视频类型
  'video/mp4': FILE_CATEGORIES.VIDEO,
  'video/webm': FILE_CATEGORIES.VIDEO,
  'video/ogg': FILE_CATEGORIES.VIDEO,
  'video/quicktime': FILE_CATEGORIES.VIDEO,
  'video/x-msvideo': FILE_CATEGORIES.VIDEO,
  'video/x-matroska': FILE_CATEGORIES.VIDEO,
  'video/x-flv': FILE_CATEGORIES.VIDEO,
  'video/3gpp': FILE_CATEGORIES.VIDEO,
  'video/mpeg': FILE_CATEGORIES.VIDEO,
  'video/x-ms-wmv': FILE_CATEGORIES.VIDEO,

  // 音频类型
  'audio/mpeg': FILE_CATEGORIES.AUDIO,
  'audio/mp3': FILE_CATEGORIES.AUDIO,
  'audio/wav': FILE_CATEGORIES.AUDIO,
  'audio/x-wav': FILE_CATEGORIES.AUDIO,
  'audio/flac': FILE_CATEGORIES.AUDIO,
  'audio/x-flac': FILE_CATEGORIES.AUDIO,
  'audio/aac': FILE_CATEGORIES.AUDIO,
  'audio/ogg': FILE_CATEGORIES.AUDIO,
  'audio/m4a': FILE_CATEGORIES.AUDIO,
  'audio/x-m4a': FILE_CATEGORIES.AUDIO,
  'audio/mp4': FILE_CATEGORIES.AUDIO,
  'audio/x-ms-wma': FILE_CATEGORIES.AUDIO,
  'audio/aiff': FILE_CATEGORIES.AUDIO,
  'audio/x-aiff': FILE_CATEGORIES.AUDIO,
  'audio/webm': FILE_CATEGORIES.AUDIO,
  'audio/midi': FILE_CATEGORIES.AUDIO,
  'audio/x-midi': FILE_CATEGORIES.AUDIO,

  // Word文档
  'application/msword': FILE_CATEGORIES.WORD,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    FILE_CATEGORIES.WORD,
  'application/vnd.ms-word.document.macroEnabled.12': FILE_CATEGORIES.WORD,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.template':
    FILE_CATEGORIES.WORD,

  // Excel表格
  'application/vnd.ms-excel': FILE_CATEGORIES.EXCEL,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    FILE_CATEGORIES.EXCEL,
  'application/vnd.ms-excel.sheet.macroEnabled.12': FILE_CATEGORIES.EXCEL,
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12':
    FILE_CATEGORIES.EXCEL,
  'text/csv': FILE_CATEGORIES.EXCEL,

  // PPT演示文稿
  'application/vnd.ms-powerpoint': FILE_CATEGORIES.PPT,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    FILE_CATEGORIES.PPT,
  'application/vnd.ms-powerpoint.presentation.macroEnabled.12':
    FILE_CATEGORIES.PPT,
  'application/vnd.openxmlformats-officedocument.presentationml.slideshow':
    FILE_CATEGORIES.PPT,

  // PDF文档
  'application/pdf': FILE_CATEGORIES.PDF,

  // 纯文本
  'text/plain': FILE_CATEGORIES.TEXT,
  'text/markdown': FILE_CATEGORIES.TEXT,
  'text/rtf': FILE_CATEGORIES.TEXT,
  'application/rtf': FILE_CATEGORIES.TEXT,

  // 代码文件
  'text/html': FILE_CATEGORIES.CODE,
  'text/css': FILE_CATEGORIES.CODE,
  'text/javascript': FILE_CATEGORIES.CODE,
  'application/javascript': FILE_CATEGORIES.CODE,
  'application/json': FILE_CATEGORIES.CODE,
  'application/xml': FILE_CATEGORIES.CODE,
  'text/xml': FILE_CATEGORIES.CODE,
  'text/x-python': FILE_CATEGORIES.CODE,
  'text/x-java-source': FILE_CATEGORIES.CODE,
  'text/x-c': FILE_CATEGORIES.CODE,
  'text/x-c++': FILE_CATEGORIES.CODE,
  'text/x-csharp': FILE_CATEGORIES.CODE,
  'text/x-go': FILE_CATEGORIES.CODE,
  'text/x-rust': FILE_CATEGORIES.CODE,
  'text/x-ruby': FILE_CATEGORIES.CODE,
  'text/x-php': FILE_CATEGORIES.CODE,
  'text/x-shellscript': FILE_CATEGORIES.CODE,
  'application/x-sh': FILE_CATEGORIES.CODE,
  'text/x-sql': FILE_CATEGORIES.CODE,
  'text/yaml': FILE_CATEGORIES.CODE,
  'application/x-yaml': FILE_CATEGORIES.CODE,
  'text/x-vue': FILE_CATEGORIES.CODE,
  'application/typescript': FILE_CATEGORIES.CODE,

  // 压缩文件
  'application/zip': FILE_CATEGORIES.ARCHIVE,
  'application/x-zip-compressed': FILE_CATEGORIES.ARCHIVE,
  'application/x-rar-compressed': FILE_CATEGORIES.ARCHIVE,
  'application/vnd.rar': FILE_CATEGORIES.ARCHIVE,
  'application/x-7z-compressed': FILE_CATEGORIES.ARCHIVE,
  'application/gzip': FILE_CATEGORIES.ARCHIVE,
  'application/x-gzip': FILE_CATEGORIES.ARCHIVE,
  'application/x-tar': FILE_CATEGORIES.ARCHIVE,
  'application/x-bzip2': FILE_CATEGORIES.ARCHIVE,
  'application/x-xz': FILE_CATEGORIES.ARCHIVE,
};

/**
 * 文件扩展名到文件类型分类的映射
 */
const EXTENSION_TYPE_MAP = {
  // 图片
  '.jpg': FILE_CATEGORIES.IMAGE,
  '.jpeg': FILE_CATEGORIES.IMAGE,
  '.png': FILE_CATEGORIES.IMAGE,
  '.gif': FILE_CATEGORIES.IMAGE,
  '.webp': FILE_CATEGORIES.IMAGE,
  '.svg': FILE_CATEGORIES.IMAGE,
  '.bmp': FILE_CATEGORIES.IMAGE,
  '.tiff': FILE_CATEGORIES.IMAGE,
  '.tif': FILE_CATEGORIES.IMAGE,
  '.ico': FILE_CATEGORIES.IMAGE,
  '.heic': FILE_CATEGORIES.IMAGE,
  '.heif': FILE_CATEGORIES.IMAGE,
  '.avif': FILE_CATEGORIES.IMAGE,
  '.raw': FILE_CATEGORIES.IMAGE,
  '.psd': FILE_CATEGORIES.IMAGE,

  // 视频
  '.mp4': FILE_CATEGORIES.VIDEO,
  '.webm': FILE_CATEGORIES.VIDEO,
  '.mov': FILE_CATEGORIES.VIDEO,
  '.avi': FILE_CATEGORIES.VIDEO,
  '.mkv': FILE_CATEGORIES.VIDEO,
  '.flv': FILE_CATEGORIES.VIDEO,
  '.wmv': FILE_CATEGORIES.VIDEO,
  '.m4v': FILE_CATEGORIES.VIDEO,
  '.3gp': FILE_CATEGORIES.VIDEO,
  '.mpeg': FILE_CATEGORIES.VIDEO,
  '.mpg': FILE_CATEGORIES.VIDEO,

  // 音乐/音频
  '.mp3': FILE_CATEGORIES.AUDIO,
  '.wav': FILE_CATEGORIES.AUDIO,
  '.flac': FILE_CATEGORIES.AUDIO,
  '.aac': FILE_CATEGORIES.AUDIO,
  '.ogg': FILE_CATEGORIES.AUDIO,
  '.m4a': FILE_CATEGORIES.AUDIO,
  '.wma': FILE_CATEGORIES.AUDIO,
  '.aiff': FILE_CATEGORIES.AUDIO,
  '.aif': FILE_CATEGORIES.AUDIO,
  '.alac': FILE_CATEGORIES.AUDIO,
  '.ape': FILE_CATEGORIES.AUDIO,
  '.opus': FILE_CATEGORIES.AUDIO,
  '.mid': FILE_CATEGORIES.AUDIO,
  '.midi': FILE_CATEGORIES.AUDIO,

  // Word文档
  '.doc': FILE_CATEGORIES.WORD,
  '.docx': FILE_CATEGORIES.WORD,
  '.docm': FILE_CATEGORIES.WORD,
  '.dotx': FILE_CATEGORIES.WORD,
  '.dot': FILE_CATEGORIES.WORD,
  '.odt': FILE_CATEGORIES.WORD,

  // Excel表格
  '.xls': FILE_CATEGORIES.EXCEL,
  '.xlsx': FILE_CATEGORIES.EXCEL,
  '.xlsm': FILE_CATEGORIES.EXCEL,
  '.xlsb': FILE_CATEGORIES.EXCEL,
  '.csv': FILE_CATEGORIES.EXCEL,
  '.ods': FILE_CATEGORIES.EXCEL,

  // PPT演示文稿
  '.ppt': FILE_CATEGORIES.PPT,
  '.pptx': FILE_CATEGORIES.PPT,
  '.pptm': FILE_CATEGORIES.PPT,
  '.ppsx': FILE_CATEGORIES.PPT,
  '.pps': FILE_CATEGORIES.PPT,
  '.odp': FILE_CATEGORIES.PPT,

  // PDF文档
  '.pdf': FILE_CATEGORIES.PDF,

  // 文本文件
  '.txt': FILE_CATEGORIES.TEXT,
  '.md': FILE_CATEGORIES.TEXT,
  '.markdown': FILE_CATEGORIES.TEXT,
  '.rtf': FILE_CATEGORIES.TEXT,
  '.log': FILE_CATEGORIES.TEXT,
  '.ini': FILE_CATEGORIES.TEXT,
  '.cfg': FILE_CATEGORIES.TEXT,
  '.conf': FILE_CATEGORIES.TEXT,

  // 代码文件
  '.html': FILE_CATEGORIES.CODE,
  '.htm': FILE_CATEGORIES.CODE,
  '.css': FILE_CATEGORIES.CODE,
  '.scss': FILE_CATEGORIES.CODE,
  '.sass': FILE_CATEGORIES.CODE,
  '.less': FILE_CATEGORIES.CODE,
  '.js': FILE_CATEGORIES.CODE,
  '.jsx': FILE_CATEGORIES.CODE,
  '.ts': FILE_CATEGORIES.CODE,
  '.tsx': FILE_CATEGORIES.CODE,
  '.vue': FILE_CATEGORIES.CODE,
  '.json': FILE_CATEGORIES.CODE,
  '.xml': FILE_CATEGORIES.CODE,
  '.yaml': FILE_CATEGORIES.CODE,
  '.yml': FILE_CATEGORIES.CODE,
  '.py': FILE_CATEGORIES.CODE,
  '.java': FILE_CATEGORIES.CODE,
  '.c': FILE_CATEGORIES.CODE,
  '.cpp': FILE_CATEGORIES.CODE,
  '.cc': FILE_CATEGORIES.CODE,
  '.h': FILE_CATEGORIES.CODE,
  '.hpp': FILE_CATEGORIES.CODE,
  '.cs': FILE_CATEGORIES.CODE,
  '.go': FILE_CATEGORIES.CODE,
  '.rs': FILE_CATEGORIES.CODE,
  '.rb': FILE_CATEGORIES.CODE,
  '.php': FILE_CATEGORIES.CODE,
  '.sh': FILE_CATEGORIES.CODE,
  '.bash': FILE_CATEGORIES.CODE,
  '.zsh': FILE_CATEGORIES.CODE,
  '.sql': FILE_CATEGORIES.CODE,
  '.swift': FILE_CATEGORIES.CODE,
  '.kt': FILE_CATEGORIES.CODE,
  '.kts': FILE_CATEGORIES.CODE,
  '.scala': FILE_CATEGORIES.CODE,
  '.r': FILE_CATEGORIES.CODE,
  '.lua': FILE_CATEGORIES.CODE,
  '.pl': FILE_CATEGORIES.CODE,
  '.pm': FILE_CATEGORIES.CODE,
  '.dart': FILE_CATEGORIES.CODE,

  // 压缩文件
  '.zip': FILE_CATEGORIES.ARCHIVE,
  '.rar': FILE_CATEGORIES.ARCHIVE,
  '.7z': FILE_CATEGORIES.ARCHIVE,
  '.tar': FILE_CATEGORIES.ARCHIVE,
  '.gz': FILE_CATEGORIES.ARCHIVE,
  '.tgz': FILE_CATEGORIES.ARCHIVE,
  '.bz2': FILE_CATEGORIES.ARCHIVE,
  '.xz': FILE_CATEGORIES.ARCHIVE,
  '.lzma': FILE_CATEGORIES.ARCHIVE,
  '.z': FILE_CATEGORIES.ARCHIVE,
};

/**
 * 根据MIME类型和文件名获取文件类型分类
 * @param {string} mimeType - MIME类型
 * @param {string} originalName - 原始文件名
 * @returns {string} 文件类型分类
 */
function detectTypeCategory(mimeType, originalName = '') {
  // 先尝试通过MIME类型判断
  const mt = String(mimeType || '').toLowerCase();
  if (MIME_TYPE_MAP[mt]) {
    return MIME_TYPE_MAP[mt];
  }

  // 使用通用MIME类型前缀判断
  if (mt.startsWith('image/')) return FILE_CATEGORIES.IMAGE;
  if (mt.startsWith('video/')) return FILE_CATEGORIES.VIDEO;
  if (mt.startsWith('audio/')) return FILE_CATEGORIES.AUDIO;
  if (mt.startsWith('text/')) return FILE_CATEGORIES.TEXT;

  // 通过文件扩展名判断
  if (originalName) {
    const name = String(originalName).toLowerCase();
    const lastDotIndex = name.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      const ext = name.substring(lastDotIndex);
      if (EXTENSION_TYPE_MAP[ext]) {
        return EXTENSION_TYPE_MAP[ext];
      }
    }
  }

  return FILE_CATEGORIES.OTHER;
}

// 导出供测试使用
export {
  detectTypeCategory,
  FILE_CATEGORIES,
  MIME_TYPE_MAP,
  EXTENSION_TYPE_MAP,
};

function buildFileUrl(baseUrl, relativePath) {
  const normalizedPath = relativePath.replace(/^\/+/, '');
  const trimmedBase = (baseUrl || '').trim();
  if (!trimmedBase) {
    return normalizedPath;
  }

  const sanitizedBase = trimmedBase.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(sanitizedBase)) {
    try {
      const base = sanitizedBase.endsWith('/')
        ? sanitizedBase
        : `${sanitizedBase}/`;
      return new URL(normalizedPath, base).toString();
    } catch {
      return `${sanitizedBase}/${normalizedPath}`;
    }
  }

  return `${sanitizedBase}/${normalizedPath}`;
}

function normalizeStoredPath(filePath) {
  return path.posix
    .normalize(String(filePath || '').replace(/\\/g, '/'))
    .replace(/^\/+/, '');
}

export class FileService {
  constructor(db) {
    this.model = new FileModel(db);
  }

  list({ page = 1, limit = 20, type = null, search = null } = {}) {
    return this.model.findAll({ page, limit, type, search });
  }

  get(id) {
    const row = this.model.findById(id);
    if (!row) {
      const err = new Error('文件不存在');
      err.status = 404;
      throw err;
    }
    return row;
  }

  create({
    originalName,
    storedName,
    filePath,
    mimeType,
    fileSize,
    uploaderId,
    baseUrl = '',
    typeCategory: explicitTypeCategory = null,
  }) {
    const typeCategory =
      explicitTypeCategory || detectTypeCategory(mimeType, originalName);
    const normalizedPath = normalizeStoredPath(filePath);
    const fileUrl = buildFileUrl(baseUrl, normalizedPath);

    const payload = {
      originalName,
      storedName,
      filePath: normalizedPath,
      mimeType,
      fileSize,
      typeCategory,
      fileUrl,
      uploaderId,
    };
    // FileModel.create expects camelCase keys; pass payload directly
    return this.model.create(payload);
  }

  createMany(entries = []) {
    const items = Array.isArray(entries) ? entries : [entries];
    if (!items.length) return [];
    const txn = this.model.db.transaction(data =>
      data.map(item => this.create(item))
    );
    return txn(items);
  }

  async remove(id) {
    const file = this.get(id);
    const filePath = file.file_path;

    this.model.delete(id);

    // 尝试删除磁盘文件（失败仅记录，不影响已完成的 DB 状态）
    try {
      const absolutePath = toUploadsAbsolutePath(filePath);
      if (!absolutePath) {
        fileServiceLogger.warn('拒绝删除非上传目录文件', {
          path: filePath,
        });
        return true;
      }
      await fs.unlink(absolutePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        fileServiceLogger.warn('删除磁盘文件失败（已忽略）', {
          error: err?.message,
        });
      }
    }

    return true;
  }
}

import path from 'path';

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

  'application/msword': FILE_CATEGORIES.WORD,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    FILE_CATEGORIES.WORD,
  'application/vnd.ms-word.document.macroEnabled.12': FILE_CATEGORIES.WORD,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.template':
    FILE_CATEGORIES.WORD,

  'application/vnd.ms-excel': FILE_CATEGORIES.EXCEL,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    FILE_CATEGORIES.EXCEL,
  'application/vnd.ms-excel.sheet.macroEnabled.12': FILE_CATEGORIES.EXCEL,
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12':
    FILE_CATEGORIES.EXCEL,
  'text/csv': FILE_CATEGORIES.EXCEL,

  'application/vnd.ms-powerpoint': FILE_CATEGORIES.PPT,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    FILE_CATEGORIES.PPT,
  'application/vnd.ms-powerpoint.presentation.macroEnabled.12':
    FILE_CATEGORIES.PPT,
  'application/vnd.openxmlformats-officedocument.presentationml.slideshow':
    FILE_CATEGORIES.PPT,

  'application/pdf': FILE_CATEGORIES.PDF,

  'text/plain': FILE_CATEGORIES.TEXT,
  'text/markdown': FILE_CATEGORIES.TEXT,
  'text/rtf': FILE_CATEGORIES.TEXT,
  'application/rtf': FILE_CATEGORIES.TEXT,

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

  '.doc': FILE_CATEGORIES.WORD,
  '.docx': FILE_CATEGORIES.WORD,
  '.docm': FILE_CATEGORIES.WORD,
  '.dotx': FILE_CATEGORIES.WORD,
  '.dot': FILE_CATEGORIES.WORD,
  '.odt': FILE_CATEGORIES.WORD,

  '.xls': FILE_CATEGORIES.EXCEL,
  '.xlsx': FILE_CATEGORIES.EXCEL,
  '.xlsm': FILE_CATEGORIES.EXCEL,
  '.xlsb': FILE_CATEGORIES.EXCEL,
  '.csv': FILE_CATEGORIES.EXCEL,
  '.ods': FILE_CATEGORIES.EXCEL,

  '.ppt': FILE_CATEGORIES.PPT,
  '.pptx': FILE_CATEGORIES.PPT,
  '.pptm': FILE_CATEGORIES.PPT,
  '.ppsx': FILE_CATEGORIES.PPT,
  '.pps': FILE_CATEGORIES.PPT,
  '.odp': FILE_CATEGORIES.PPT,

  '.pdf': FILE_CATEGORIES.PDF,

  '.txt': FILE_CATEGORIES.TEXT,
  '.md': FILE_CATEGORIES.TEXT,
  '.markdown': FILE_CATEGORIES.TEXT,
  '.rtf': FILE_CATEGORIES.TEXT,
  '.log': FILE_CATEGORIES.TEXT,
  '.ini': FILE_CATEGORIES.TEXT,
  '.cfg': FILE_CATEGORIES.TEXT,
  '.conf': FILE_CATEGORIES.TEXT,

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

export function detectTypeCategory(mimeType, originalName = '') {
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  if (MIME_TYPE_MAP[normalizedMimeType]) {
    return MIME_TYPE_MAP[normalizedMimeType];
  }

  if (normalizedMimeType.startsWith('image/')) return FILE_CATEGORIES.IMAGE;
  if (normalizedMimeType.startsWith('video/')) return FILE_CATEGORIES.VIDEO;
  if (normalizedMimeType.startsWith('audio/')) return FILE_CATEGORIES.AUDIO;
  if (normalizedMimeType.startsWith('text/')) return FILE_CATEGORIES.TEXT;

  if (originalName) {
    const name = String(originalName).toLowerCase();
    const lastDotIndex = name.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      const extension = name.substring(lastDotIndex);
      if (EXTENSION_TYPE_MAP[extension]) {
        return EXTENSION_TYPE_MAP[extension];
      }
    }
  }

  return FILE_CATEGORIES.OTHER;
}

export function buildFileUrl(baseUrl, relativePath) {
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

export function normalizeStoredPath(filePath) {
  return path.posix
    .normalize(String(filePath || '').replace(/\\/g, '/'))
    .replace(/^\/+/, '');
}

export { EXTENSION_TYPE_MAP, FILE_CATEGORIES, MIME_TYPE_MAP };

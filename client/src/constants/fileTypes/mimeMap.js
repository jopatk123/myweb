import { FILE_CATEGORIES } from './categories.js';

/**
 * MIME类型到文件类型分类的映射
 */
export const MIME_TYPE_MAP = {
  // 图片
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

  // 视频
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

  // 音频
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

  // Word
  'application/msword': FILE_CATEGORIES.WORD,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    FILE_CATEGORIES.WORD,
  'application/vnd.ms-word.document.macroEnabled.12': FILE_CATEGORIES.WORD,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.template':
    FILE_CATEGORIES.WORD,

  // Excel
  'application/vnd.ms-excel': FILE_CATEGORIES.EXCEL,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    FILE_CATEGORIES.EXCEL,
  'application/vnd.ms-excel.sheet.macroEnabled.12': FILE_CATEGORIES.EXCEL,
  'application/vnd.ms-excel.sheet.binary.macroEnabled.12':
    FILE_CATEGORIES.EXCEL,
  'text/csv': FILE_CATEGORIES.EXCEL,

  // PPT
  'application/vnd.ms-powerpoint': FILE_CATEGORIES.PPT,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    FILE_CATEGORIES.PPT,
  'application/vnd.ms-powerpoint.presentation.macroEnabled.12':
    FILE_CATEGORIES.PPT,
  'application/vnd.openxmlformats-officedocument.presentationml.slideshow':
    FILE_CATEGORIES.PPT,

  // PDF
  'application/pdf': FILE_CATEGORIES.PDF,

  // 纯文本
  'text/plain': FILE_CATEGORIES.TEXT,
  'text/markdown': FILE_CATEGORIES.TEXT,
  'text/rtf': FILE_CATEGORIES.TEXT,
  'application/rtf': FILE_CATEGORIES.TEXT,

  // 代码
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

  // 压缩
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

/**
 * 文件类型常量（前后端共享单一真相源）
 *
 * 这些映射在前后端都需要使用且必须保持完全一致：
 * - 前端通过 `@shared/fileTypes.js` 别名导入（见 client/vite.config.js）
 * - 后端通过相对路径 `../shared/fileTypes.js` 导入
 *
 * 仅承载纯数据映射；UI 相关常量（图标、预览能力、上传大小限制）
 * 由前端单独维护，不放入此处。
 */

/** 文件类型分类枚举 */
export const FILE_CATEGORIES = {
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
 * MIME 类型 → 文件类型分类的映射
 * 前后端必须共享同一份，避免类型识别漂移
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

/**
 * 文件扩展名 → 文件类型分类的映射（MIME 类型无法判断时的回退）
 */
export const EXTENSION_TYPE_MAP = {
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

  // 音频
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

  // Word
  '.doc': FILE_CATEGORIES.WORD,
  '.docx': FILE_CATEGORIES.WORD,
  '.docm': FILE_CATEGORIES.WORD,
  '.dotx': FILE_CATEGORIES.WORD,
  '.dot': FILE_CATEGORIES.WORD,
  '.odt': FILE_CATEGORIES.WORD,

  // Excel
  '.xls': FILE_CATEGORIES.EXCEL,
  '.xlsx': FILE_CATEGORIES.EXCEL,
  '.xlsm': FILE_CATEGORIES.EXCEL,
  '.xlsb': FILE_CATEGORIES.EXCEL,
  '.csv': FILE_CATEGORIES.EXCEL,
  '.ods': FILE_CATEGORIES.EXCEL,

  // PPT
  '.ppt': FILE_CATEGORIES.PPT,
  '.pptx': FILE_CATEGORIES.PPT,
  '.pptm': FILE_CATEGORIES.PPT,
  '.ppsx': FILE_CATEGORIES.PPT,
  '.pps': FILE_CATEGORIES.PPT,
  '.odp': FILE_CATEGORIES.PPT,

  // PDF
  '.pdf': FILE_CATEGORIES.PDF,

  // 文本
  '.txt': FILE_CATEGORIES.TEXT,
  '.md': FILE_CATEGORIES.TEXT,
  '.markdown': FILE_CATEGORIES.TEXT,
  '.rtf': FILE_CATEGORIES.TEXT,
  '.log': FILE_CATEGORIES.TEXT,
  '.ini': FILE_CATEGORIES.TEXT,
  '.cfg': FILE_CATEGORIES.TEXT,
  '.conf': FILE_CATEGORIES.TEXT,

  // 代码
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
  '.ex': FILE_CATEGORIES.CODE,
  '.exs': FILE_CATEGORIES.CODE,
  '.clj': FILE_CATEGORIES.CODE,
  '.hs': FILE_CATEGORIES.CODE,
  '.fs': FILE_CATEGORIES.CODE,
  '.ml': FILE_CATEGORIES.CODE,
  '.elm': FILE_CATEGORIES.CODE,

  // 压缩
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
 * 默认禁用的可执行/脚本类扩展名（白名单模式下拒绝）
 * 这些类型在浏览器中可能被直接渲染或执行，存在存储型 XSS 或本地执行风险
 */
export const BLOCKED_EXECUTABLE_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.svg',
  '.js',
  '.mjs',
  '.cjs',
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.scr',
  '.vbs',
  '.ps1',
  '.sh',
  '.bash',
  '.zsh',
  '.msi',
  '.dll',
  '.so',
  '.dylib',
]);

/**
 * 默认禁用的可执行/脚本类 MIME 类型（白名单模式下拒绝）
 */
export const BLOCKED_EXECUTABLE_MIME_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'text/javascript',
  'application/javascript',
  'application/x-javascript',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-dosexec',
]);

/**
 * 文件类型常量定义
 * 用于统一管理文件类型分类、图标和MIME类型映射
 */

/**
 * 文件类型分类枚举
 */
export const FILE_CATEGORIES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  MUSIC: 'music', // 音乐文件（与audio区分，用于音乐播放器）
  WORD: 'word',
  EXCEL: 'excel',
  PPT: 'ppt',
  PDF: 'pdf',
  TEXT: 'text',
  CODE: 'code',
  ARCHIVE: 'archive',
  NOVEL: 'novel',
  OTHER: 'other',
};

/**
 * MIME类型到文件类型分类的映射
 */
export const MIME_TYPE_MAP = {
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
  'audio/mpeg': FILE_CATEGORIES.MUSIC,
  'audio/mp3': FILE_CATEGORIES.MUSIC,
  'audio/wav': FILE_CATEGORIES.MUSIC,
  'audio/x-wav': FILE_CATEGORIES.MUSIC,
  'audio/flac': FILE_CATEGORIES.MUSIC,
  'audio/x-flac': FILE_CATEGORIES.MUSIC,
  'audio/aac': FILE_CATEGORIES.MUSIC,
  'audio/ogg': FILE_CATEGORIES.MUSIC,
  'audio/m4a': FILE_CATEGORIES.MUSIC,
  'audio/x-m4a': FILE_CATEGORIES.MUSIC,
  'audio/mp4': FILE_CATEGORIES.MUSIC,
  'audio/x-ms-wma': FILE_CATEGORIES.MUSIC,
  'audio/aiff': FILE_CATEGORIES.MUSIC,
  'audio/x-aiff': FILE_CATEGORIES.MUSIC,
  'audio/webm': FILE_CATEGORIES.MUSIC,
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
 * 文件扩展名到文件类型分类的映射（用于MIME类型无法判断时的回退）
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

  // 音乐/音频
  '.mp3': FILE_CATEGORIES.MUSIC,
  '.wav': FILE_CATEGORIES.MUSIC,
  '.flac': FILE_CATEGORIES.MUSIC,
  '.aac': FILE_CATEGORIES.MUSIC,
  '.ogg': FILE_CATEGORIES.MUSIC,
  '.m4a': FILE_CATEGORIES.MUSIC,
  '.wma': FILE_CATEGORIES.MUSIC,
  '.aiff': FILE_CATEGORIES.MUSIC,
  '.aif': FILE_CATEGORIES.MUSIC,
  '.alac': FILE_CATEGORIES.MUSIC,
  '.ape': FILE_CATEGORIES.MUSIC,
  '.opus': FILE_CATEGORIES.MUSIC,
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
  '.ex': FILE_CATEGORIES.CODE,
  '.exs': FILE_CATEGORIES.CODE,
  '.clj': FILE_CATEGORIES.CODE,
  '.hs': FILE_CATEGORIES.CODE,
  '.fs': FILE_CATEGORIES.CODE,
  '.ml': FILE_CATEGORIES.CODE,
  '.elm': FILE_CATEGORIES.CODE,

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

  // 小说/电子书
  '.epub': FILE_CATEGORIES.NOVEL,
  '.mobi': FILE_CATEGORIES.NOVEL,
  '.azw': FILE_CATEGORIES.NOVEL,
  '.azw3': FILE_CATEGORIES.NOVEL,
  '.fb2': FILE_CATEGORIES.NOVEL,
};

/**
 * 文件类型对应的图标路径
 */
export const FILE_TYPE_ICONS = {
  [FILE_CATEGORIES.IMAGE]: '/apps/icons/image-128.svg',
  [FILE_CATEGORIES.VIDEO]: '/apps/icons/video-128.svg',
  [FILE_CATEGORIES.AUDIO]: '/apps/icons/audio-128.svg',
  [FILE_CATEGORIES.MUSIC]: '/apps/icons/music-128.svg',
  [FILE_CATEGORIES.WORD]: '/apps/icons/word-128.svg',
  [FILE_CATEGORIES.EXCEL]: '/apps/icons/excel-128.svg',
  [FILE_CATEGORIES.PPT]: '/apps/icons/ppt-128.svg',
  [FILE_CATEGORIES.PDF]: '/apps/icons/pdf-128.svg',
  [FILE_CATEGORIES.TEXT]: '/apps/icons/text-128.svg',
  [FILE_CATEGORIES.CODE]: '/apps/icons/code-128.svg',
  [FILE_CATEGORIES.ARCHIVE]: '/apps/icons/archive-128.svg',
  [FILE_CATEGORIES.NOVEL]: '/apps/icons/novel-128.svg',
  [FILE_CATEGORIES.OTHER]: '/apps/icons/file-128.svg',
};

/**
 * 根据MIME类型和文件名获取文件类型分类
 * @param {string} mimeType - MIME类型
 * @param {string} fileName - 文件名
 * @returns {string} 文件类型分类
 */
export function getFileCategory(mimeType, fileName = '') {
  // 先尝试通过MIME类型判断
  if (mimeType && MIME_TYPE_MAP[mimeType.toLowerCase()]) {
    return MIME_TYPE_MAP[mimeType.toLowerCase()];
  }

  // 使用通用MIME类型前缀判断
  const mt = String(mimeType || '').toLowerCase();
  if (mt.startsWith('image/')) return FILE_CATEGORIES.IMAGE;
  if (mt.startsWith('video/')) return FILE_CATEGORIES.VIDEO;
  if (mt.startsWith('audio/')) return FILE_CATEGORIES.MUSIC;
  if (mt.startsWith('text/')) return FILE_CATEGORIES.TEXT;

  // 通过文件扩展名判断
  if (fileName) {
    const name = String(fileName).toLowerCase();
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

/**
 * 获取文件类型对应的图标路径
 * @param {string} category - 文件类型分类
 * @returns {string} 图标路径
 */
export function getFileIcon(category) {
  return FILE_TYPE_ICONS[category] || FILE_TYPE_ICONS[FILE_CATEGORIES.OTHER];
}

/**
 * 根据文件信息获取图标路径
 * @param {string} mimeType - MIME类型
 * @param {string} fileName - 文件名
 * @returns {string} 图标路径
 */
export function getFileIconByFile(mimeType, fileName) {
  const category = getFileCategory(mimeType, fileName);
  return getFileIcon(category);
}

/**
 * 可预览的文件类型列表
 */
export const PREVIEWABLE_CATEGORIES = [
  FILE_CATEGORIES.IMAGE,
  FILE_CATEGORIES.VIDEO,
  FILE_CATEGORIES.WORD,
  FILE_CATEGORIES.EXCEL,
  FILE_CATEGORIES.PDF,
  FILE_CATEGORIES.TEXT,
  FILE_CATEGORIES.CODE,
];

/**
 * 判断文件是否可预览
 * @param {string} category - 文件类型分类
 * @returns {boolean}
 */
export function isPreviewable(category) {
  return PREVIEWABLE_CATEGORIES.includes(category);
}

/**
 * 上传文件大小限制（字节）
 */
export const UPLOAD_SIZE_LIMITS = {
  DEFAULT: 1024 * 1024 * 1024, // 1GB
  IMAGE: 50 * 1024 * 1024, // 50MB
  VIDEO: 2 * 1024 * 1024 * 1024, // 2GB
  AUDIO: 200 * 1024 * 1024, // 200MB
  DOCUMENT: 100 * 1024 * 1024, // 100MB
};

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes, decimals = 1) {
  if (!bytes || bytes <= 0 || !isFinite(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length) return '0 B';
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
  );
}

/**
 * 格式化上传速度
 * @param {number} bytesPerSecond - 每秒字节数
 * @returns {string} 格式化后的速度
 */
export function formatUploadSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0 || !isFinite(bytesPerSecond))
    return '';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  if (i < 0 || i >= sizes.length) return '';
  return (
    parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  );
}

/**
 * 格式化剩余时间
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间
 */
export function formatRemainingTime(seconds) {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '';

  if (seconds < 60) {
    return `${Math.ceil(seconds)}秒`;
  }

  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
  }

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}时${mins}分` : `${hours}时`;
}

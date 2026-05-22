/**
 * 文件类型常量 barrel 模块。
 * 实际定义已拆分到 fileTypes/ 子目录与 utils/fileType.js。
 * 保留此文件以维持现有导入路径不变。
 */
export { FILE_CATEGORIES } from './fileTypes/categories.js';
export { MIME_TYPE_MAP } from './fileTypes/mimeMap.js';
export { EXTENSION_TYPE_MAP } from './fileTypes/extensionMap.js';
export { FILE_TYPE_ICONS, PREVIEWABLE_CATEGORIES } from './fileTypes/icons.js';
export { UPLOAD_SIZE_LIMITS } from './fileTypes/uploadLimits.js';
export {
  getFileCategory,
  getFileIcon,
  getFileIconByFile,
  isPreviewable,
} from '../utils/fileType.js';
export { formatFileSize } from '../utils/fileSize.js';
export {
  formatUploadSpeed,
  formatRemainingTime,
} from '../utils/fileProgress.js';

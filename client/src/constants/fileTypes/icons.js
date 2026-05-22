import { FILE_CATEGORIES } from './categories.js';

/**
 * 文件类型对应的图标路径
 */
export const FILE_TYPE_ICONS = {
  [FILE_CATEGORIES.IMAGE]: '/apps/icons/image-128.svg',
  [FILE_CATEGORIES.VIDEO]: '/apps/icons/video-128.svg',
  [FILE_CATEGORIES.AUDIO]: '/apps/icons/audio-128.svg',
  [FILE_CATEGORIES.WORD]: '/apps/icons/word-128.svg',
  [FILE_CATEGORIES.EXCEL]: '/apps/icons/excel-128.svg',
  [FILE_CATEGORIES.PPT]: '/apps/icons/ppt-128.svg',
  [FILE_CATEGORIES.PDF]: '/apps/icons/pdf-128.svg',
  [FILE_CATEGORIES.TEXT]: '/apps/icons/text-128.svg',
  [FILE_CATEGORIES.CODE]: '/apps/icons/code-128.svg',
  [FILE_CATEGORIES.ARCHIVE]: '/apps/icons/archive-128.svg',
  [FILE_CATEGORIES.OTHER]: '/apps/icons/file-128.svg',
};

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

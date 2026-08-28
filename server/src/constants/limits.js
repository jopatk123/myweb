/**
 * 上传与业务约束常量
 * 统一管理所有魔法数字，便于集中维护。
 */

// 跨端共享常量：值定义在 shared/constants.js，前后端共同导入，
// 避免出现"前端用 5、后端用 6"这类不一致。
export { MESSAGE_CONTENT_MAX_LENGTH } from '../../../shared/constants.js';

import {
  MESSAGE_IMAGE_MAX_COUNT,
  MESSAGE_IMAGE_MAX_SIZE,
  FILE_UPLOAD_MAX_SIZE,
} from '../../../shared/constants.js';

// 保持对外的再导出，既有消费方继续从 limits.js 引用
export { MESSAGE_IMAGE_MAX_COUNT };

/** 24 小时对应的毫秒数 */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ─── 壁纸 ────────────────────────────────────────────────────────────────────

/** 壁纸单文件最大上传尺寸默认值（500 MiB）*/
export const DEFAULT_WALLPAPER_MAX_SIZE = 500 * 1024 * 1024;

// ─── 文件管理器 ───────────────────────────────────────────────────────────────

/** 文件单文件最大上传尺寸默认值（1 GiB，复用共享常量避免前后端漂移）*/
export const DEFAULT_FILE_MAX_SIZE = FILE_UPLOAD_MAX_SIZE;

// ─── 留言板图片 ───────────────────────────────────────────────────────────────

/** 留言板图片单文件最大尺寸默认值（5 MiB，复用共享常量避免双份定义漂移）*/
export const DEFAULT_MESSAGE_IMAGE_MAX_SIZE = MESSAGE_IMAGE_MAX_SIZE;

/** 留言板每次请求最多上传图片数量默认值（直接复用共享常量，避免双份定义漂移）*/
export const DEFAULT_MESSAGE_IMAGE_MAX_FILES = MESSAGE_IMAGE_MAX_COUNT;

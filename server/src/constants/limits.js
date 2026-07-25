/**
 * 上传与业务约束常量
 * 统一管理所有魔法数字，便于集中维护。
 */

// 跨端共享常量：值定义在 shared/constants.js，前后端共同导入，
// 避免出现"前端用 5、后端用 6"这类不一致。
export {
  MESSAGE_CONTENT_MAX_LENGTH,
  MESSAGE_IMAGE_MAX_COUNT,
} from '../../../shared/constants.js';

/** 24 小时对应的毫秒数 */
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ─── 壁纸 ────────────────────────────────────────────────────────────────────

/** 壁纸单文件最大上传尺寸默认值（500 MiB）*/
export const DEFAULT_WALLPAPER_MAX_SIZE = 500 * 1024 * 1024;

// ─── 文件管理器 ───────────────────────────────────────────────────────────────

/** 文件单文件最大上传尺寸默认值（1 GiB）*/
export const DEFAULT_FILE_MAX_SIZE = 1024 * 1024 * 1024;

// ─── 留言板图片 ───────────────────────────────────────────────────────────────

/** 留言板图片单文件最大尺寸默认值（5 MiB）*/
export const DEFAULT_MESSAGE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

/** 留言板每次请求最多上传图片数量默认值 */
export const DEFAULT_MESSAGE_IMAGE_MAX_FILES = 5;

// ─── Session ──────────────────────────────────────────────────────────────────

/** HTTP Session Cookie 最大有效期（24 小时）*/
export const SESSION_MAX_AGE_MS = ONE_DAY_MS;

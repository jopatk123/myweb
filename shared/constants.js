/**
 * 跨端共享常量
 *
 * 这些值在前后端都需要使用（前端 UI 限制、后端 DTO/service 校验），
 * 必须保持完全一致，因此放在 shared 目录由两端共同导入。
 *
 * 注意：
 * - 前端通过 `@shared/constants.js` 别名导入（见 vite.config.js）
 * - 后端通过相对路径 `../shared/constants.js` 导入
 * - 服务端实际限制定义在 server/src/constants/limits.js，
 *   本文件是给前端用的镜像值，由 server 在 limits.js 中重新导出或对齐
 */

/** 留言正文最大字符数（前后端一致） */
export const MESSAGE_CONTENT_MAX_LENGTH = 10000;

/** 留言列表默认折叠显示的最大行数（仅前端展示） */
export const MESSAGE_TEXT_COLLAPSED_LINES = 5;

/** 单条留言最多附带图片数量（前后端一致） */
export const MESSAGE_IMAGE_MAX_COUNT = 5;

/**
 * 留言板单张图片大小默认上限（5 MiB）。
 * 服务端实际限制可经 MESSAGE_IMAGE_MAX_SIZE 环境变量覆盖
 * （见 server/src/constants/limits.js 的 DEFAULT_MESSAGE_IMAGE_MAX_SIZE），
 * 此处为前端上传前预检用的默认镜像值：前端以此做压缩/拦截预检，
 * 最终以服务端校验为准。
 */
export const MESSAGE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

/**
 * 文件管理器单文件上传大小默认上限（1 GiB，前后端一致）。
 * 服务端实际限制可经 FILE_MAX_UPLOAD_SIZE 环境变量覆盖
 * （见 server/src/constants/limits.js 的 DEFAULT_FILE_MAX_SIZE），
 * 此处为前端上传前预检用的默认镜像值，最终以服务端校验为准。
 */
export const FILE_UPLOAD_MAX_SIZE = 1024 * 1024 * 1024;

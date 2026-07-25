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
export const MESSAGE_CONTENT_MAX_LENGTH = 1000;

/** 单条留言最多附带图片数量（前后端一致） */
export const MESSAGE_IMAGE_MAX_COUNT = 5;

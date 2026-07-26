/**
 * 文件管理路由入口
 *
 * 实际控制器逻辑已拆分到 controllers/file.controller.js，
 * 本文件仅做路由挂载，与项目其他模块（wallpapers/messages 等）的分层保持一致。
 */
export { createFileRoutes } from '../controllers/file.controller.js';

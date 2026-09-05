/**
 * 应用图标上传约束（前后端共享）
 *
 * - 前端：选文件时预检 MIME / 扩展名 / 体积
 * - 后端：默认体积上限镜像；实际仍以 APP_ICON_MAX_UPLOAD_SIZE 为准
 */

/** 图标上传默认上限（5 MiB），与服务端 DEFAULT 对齐 */
export const APP_ICON_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** 自定义上传允许的扩展名（不含点） */
export const APP_ICON_ALLOWED_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'svg',
  'ico',
];

/** 自定义上传允许的 MIME（部分浏览器对 SVG/ICO 声明不稳定，需与扩展名并用） */
export const APP_ICON_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

export const APP_ICON_ACCEPT = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.svg',
  '.ico',
].join(',');

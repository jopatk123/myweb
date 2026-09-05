import {
  APP_ICON_ALLOWED_EXTENSIONS,
  APP_ICON_ALLOWED_MIME_TYPES,
  APP_ICON_MAX_UPLOAD_BYTES,
} from '@shared/app-icons.js';

/**
 * 自定义图标本地预检。最终以服务端校验为准。
 * @param {File|null|undefined} file
 * @returns {{ ok: boolean, message?: string }}
 */
export function validateAppIconFile(file) {
  if (!file) {
    return { ok: false, message: '请选择图标文件' };
  }
  if (file.size > APP_ICON_MAX_UPLOAD_BYTES) {
    return { ok: false, message: '图标文件不能超过 5MB' };
  }
  const ext = String(file.name || '')
    .split('.')
    .pop()
    ?.toLowerCase();
  const mimeOk = APP_ICON_ALLOWED_MIME_TYPES.includes(file.type);
  const extOk = APP_ICON_ALLOWED_EXTENSIONS.includes(ext);
  if (!mimeOk && !extOk) {
    return {
      ok: false,
      message: '仅支持 PNG、JPEG、WebP、GIF、SVG、ICO 格式的图标',
    };
  }
  return { ok: true };
}

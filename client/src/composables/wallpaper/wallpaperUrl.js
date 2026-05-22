import { appEnv } from '@/constants/env.js';
import { wallpaperApi } from '@/api/wallpaper.js';

/** MIME 类型到文件扩展名映射（用于下载时确定后缀） */
const MIME_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
};

export function getFileExtension(mimeType) {
  return MIME_TO_EXTENSION[mimeType] || 'bin';
}

/**
 * 构造壁纸资源的可访问 URL。
 *  - uploads/ 开头的相对路径直接挂到根上，避免走 API
 *  - 其他情况使用 appEnv.apiBase 拼接
 *  - 默认追加 ?v=<updatedAt> 以避免浏览器缓存
 */
export function getWallpaperUrl(wallpaper, options = {}) {
  if (!wallpaper) return null;
  const fp = wallpaper.filePath || wallpaper.file_path || '';

  let basePath = '';
  if (fp.startsWith('uploads/')) {
    basePath = `/${fp}`;
  } else {
    const base = appEnv.apiBase || '';
    const pathPart = String(fp).replace(/^\/+/, '');
    if (base) {
      basePath = `${String(base).replace(/\/+$/, '')}/${pathPart}`;
    } else {
      basePath = `/${pathPart}`;
    }
  }

  if (options.addVersion !== false) {
    const updatedAt = wallpaper.updatedAt || wallpaper.updated_at;
    if (updatedAt) {
      const ts = new Date(updatedAt).getTime();
      if (!Number.isNaN(ts)) {
        const separator = basePath.includes('?') ? '&' : '?';
        return `${basePath}${separator}v=${ts}`;
      }
    }
  }

  return basePath;
}

/**
 * 触发壁纸下载（单张直链或多张 ZIP）。
 * 调用方需自行处理 error.value，本函数仅抛出原始错误。
 */
export async function downloadWallpapers(ids) {
  const blob = await wallpaperApi.downloadWallpapers(ids);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  if (ids.length === 1) {
    link.download = `wallpaper_${ids[0]}.${getFileExtension(blob.type)}`;
  } else {
    link.download = `wallpapers_${new Date().getTime()}.zip`;
  }

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

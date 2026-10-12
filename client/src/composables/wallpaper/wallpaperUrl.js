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

function getFileExtension(mimeType) {
  return MIME_TO_EXTENSION[mimeType] || 'bin';
}

/** 点击后立刻 revoke 会让部分浏览器还没开始保存就把 blob 释放掉。 */
const DOWNLOAD_URL_REVOKE_DELAY_MS = 1000;

function sanitizeDownloadName(fileName, fallback) {
  const base = String(fileName || '')
    .split(/[\\/]/)
    .pop()
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f]/g, '')
    .trim();
  if (!base || base === '.' || base === '..') return fallback;
  return base;
}

function resolveDownloadFilename(ids, blob, fileName) {
  if (ids.length !== 1) {
    return `wallpapers_${Date.now()}.zip`;
  }
  const fallback = `wallpaper_${ids[0]}.${getFileExtension(blob.type)}`;
  const safeName = sanitizeDownloadName(fileName, '');
  if (!safeName) return fallback;
  if (/\.[A-Za-z0-9]{1,8}$/.test(safeName)) return safeName;
  const ext = getFileExtension(blob.type);
  return ext === 'bin' ? safeName : `${safeName}.${ext}`;
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_REVOKE_DELAY_MS);
}

function readBlobText(blob) {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

async function describeDownloadError(err) {
  const payload = err?.payload;
  const isBlob =
    payload instanceof Blob ||
    (payload &&
      typeof payload.size === 'number' &&
      typeof payload.slice === 'function');
  if (!isBlob) return err;
  try {
    const json = JSON.parse(await readBlobText(payload));
    if (json?.message) {
      const wrapped = new Error(json.message);
      wrapped.cause = err;
      return wrapped;
    }
  } catch {
    // 错误体不是 JSON 时保留拦截器给出的原始错误
  }
  return err;
}

/**
 * 构造壁纸资源的可访问 URL。
 *  - uploads/ 开头的相对路径直接挂到根上，避免走 API
 *  - 其他情况使用 appEnv.apiBase 拼接
 *
 * 不追加版本参数：文件名为上传时生成的 UUID，内容不可变，
 * URL 天然适合 immutable 长缓存；此前追加的 ?v=<updatedAt> 会因
 * 激活切换刷新 updated_at 而变化，导致浏览器缓存被反复击穿。
 */
export function getWallpaperUrl(wallpaper) {
  if (!wallpaper) return null;
  const fp = wallpaper.filePath || wallpaper.file_path || '';

  if (fp.startsWith('uploads/')) {
    return `/${fp}`;
  }
  const base = appEnv.apiBase || '';
  const pathPart = String(fp).replace(/^\/+/, '');
  if (base) {
    return `${String(base).replace(/\/+$/, '')}/${pathPart}`;
  }
  return `/${pathPart}`;
}

/**
 * 触发壁纸下载（单张直链或多张 ZIP）。
 * 调用方需自行处理 error.value，本函数仅抛出原始错误。
 */
export async function downloadWallpapers(ids, options = {}) {
  const { onProgress, fileName } = options;
  let blob;
  try {
    blob = onProgress
      ? await wallpaperApi.downloadWallpapers(ids, {
          onDownloadProgress: event => {
            onProgress({
              loaded: Number(event?.loaded) || 0,
              total: Number(event?.total) || 0,
            });
          },
        })
      : await wallpaperApi.downloadWallpapers(ids);
  } catch (err) {
    throw await describeDownloadError(err);
  }

  triggerBlobDownload(blob, resolveDownloadFilename(ids, blob, fileName));
  return true;
}

import { createReadStream, existsSync } from 'fs';
import archiver from 'archiver';
import logger from '../../utils/logger.js';
import { toUploadsAbsolutePath } from '../../utils/upload-path.js';

const downloadLogger = logger.child('WallpaperDownload');

/**
 * 生成符合 RFC 6266 的 Content-Disposition 头值。
 * - 使用 filename*=UTF-8'' 确保非 ASCII 文件名正确传递
 * - 同时提供 ASCII 安全回退，避免旧客户端乱码
 */
export function buildContentDisposition(name) {
  const safe = String(name).replace(/[^\w\-. ]/g, '_');
  const encoded = encodeURIComponent(name);
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

/**
 * 处理一组壁纸的下载请求：
 *  - 单张直接以原文件流返回
 *  - 多张打包为 zip 流式返回
 *  - 任何 400/404 响应直接由该函数写出，调用方仅需处理抛出的异常
 */
export async function streamWallpaperDownload(res, wallpapers) {
  if (wallpapers.length === 1) {
    const wallpaper = wallpapers[0];
    const filePath = toUploadsAbsolutePath(wallpaper.file_path);

    if (!filePath) {
      res.status(400).json({ code: 400, message: '壁纸文件路径无效' });
      return;
    }

    if (!existsSync(filePath)) {
      res.status(404).json({ code: 404, message: '壁纸文件不存在' });
      return;
    }

    const singleName = wallpaper.original_name || `wallpaper_${wallpaper.id}`;
    res.setHeader('Content-Disposition', buildContentDisposition(singleName));
    res.setHeader('Content-Type', wallpaper.mime_type || 'image/jpeg');
    const singleStream = createReadStream(filePath);
    singleStream.on('error', err => {
      downloadLogger.error('单文件下载流错误', {
        id: wallpaper.id,
        filePath,
        error: err?.message || err,
      });
      // headers 已发送，只能终止响应避免客户端挂起
      res.destroy();
    });
    singleStream.pipe(res);
    return;
  }

  // 多张：先校验全部路径合法性，再开始流式打包
  const archiveEntries = [];
  for (const wallpaper of wallpapers) {
    const filePath = toUploadsAbsolutePath(wallpaper.file_path);
    if (!filePath) {
      res.status(400).json({ code: 400, message: '壁纸文件路径无效' });
      return;
    }
    if (existsSync(filePath)) {
      archiveEntries.push({
        filePath,
        name: wallpaper.original_name || `wallpaper_${wallpaper.id}`,
      });
    } else {
      downloadLogger.warn('下载时壁纸文件不存在（已跳过）', {
        id: wallpaper.id,
        filePath: wallpaper.file_path,
      });
    }
  }

  if (archiveEntries.length === 0) {
    res.status(404).json({ code: 404, message: '壁纸文件不存在' });
    return;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''wallpapers_${Date.now()}.zip`
  );

  const archive = archiver('zip', { zlib: { level: 6 } });

  archive.on('error', err => {
    downloadLogger.error('Archive error', err);
    if (!res.headersSent) {
      res.status(500).json({ code: 500, message: 'ZIP 打包失败' });
    } else {
      // headers 已发送，无法再返回错误码，直接终止响应避免客户端挂起
      res.destroy();
    }
  });

  archive.pipe(res);
  for (const { filePath, name } of archiveEntries) {
    archive.file(filePath, { name });
  }
  await archive.finalize();
}

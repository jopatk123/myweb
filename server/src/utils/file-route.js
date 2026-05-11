import fs from 'fs';
import fsPromises from 'fs/promises';
import { toUploadsAbsolutePath, toUploadsRelativePath } from './upload-path.js';

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function isTrustedBaseUrl(req, value) {
  try {
    const candidate = new URL(value);
    if (!['http:', 'https:'].includes(candidate.protocol)) {
      return false;
    }

    const requestHost = (req.get('host') || '').trim().toLowerCase();
    if (!requestHost) {
      return true;
    }

    return candidate.host.toLowerCase() === requestHost;
  } catch {
    return false;
  }
}

export function resolveRequestBaseUrl(req) {
  const headerBase = (req.get('x-api-base') || '').trim();
  if (headerBase && isTrustedBaseUrl(req, headerBase)) {
    return headerBase.replace(/\/+$/, '');
  }

  const forwardedProto = (req.get('x-forwarded-proto') || '')
    .split(',')[0]
    ?.trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = (req.get('host') || '').trim();
  if (!host) {
    return '';
  }

  return `${protocol}://${host}`.replace(/\/+$/, '');
}

export function buildUploadPayloads(files, baseUrl) {
  return files.map(file => ({
    originalName: file.originalname,
    storedName: file.filename,
    filePath: toUploadsRelativePath('files', file.filename),
    mimeType: file.mimetype,
    fileSize: file.size,
    uploaderId: null,
    baseUrl,
  }));
}

export async function cleanupUploadedPayloadFiles(payloads, onCleanupError) {
  await Promise.allSettled(
    payloads.map(async payload => {
      const diskPath = toUploadsAbsolutePath(payload.filePath);
      if (!diskPath) {
        return;
      }

      try {
        await fsPromises.unlink(diskPath);
      } catch (error) {
        if (error?.code !== 'ENOENT') {
          onCleanupError(error, payload);
        }
      }
    })
  );
}

export function toCreatedFileResponse(results) {
  return Array.isArray(results) && results.length === 1 ? results[0] : results;
}

export function buildFileListData(result) {
  return {
    files: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / (result.limit || 1))),
    },
  };
}

export async function resolveDownloadAbsolutePath(fileRecord) {
  const storedPath = fileRecord.file_path || fileRecord.filePath;
  if (!storedPath) {
    throw createHttpError('文件路径缺失', 500);
  }

  const absolutePath = toUploadsAbsolutePath(storedPath);
  if (!absolutePath) {
    throw createHttpError('非法的文件路径', 400);
  }

  try {
    await fsPromises.access(absolutePath, fs.constants.R_OK);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw createHttpError('文件不存在或已被删除', 404);
    }
    throw error;
  }

  return absolutePath;
}

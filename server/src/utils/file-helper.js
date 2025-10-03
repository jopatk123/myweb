import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileLogger = logger.child('FileHelper');

export async function createUploadDirs() {
  const uploadDirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/wallpapers'),
    path.join(__dirname, '../../uploads/apps'),
    path.join(__dirname, '../../uploads/apps/icons'),
    path.join(__dirname, '../../uploads/files'),
    path.join(__dirname, '../../uploads/novels'),
    path.join(__dirname, '../../data'),
    path.join(__dirname, '../../logs'),
  ];

  for (const dir of uploadDirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      fileLogger.debug('Created directory', { path: dir });
    }
  }
}

export function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

export function isImageFile(mimetype) {
  return mimetype.startsWith('image/');
}

export async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    fileLogger.warn('Failed to delete file', {
      filePath,
      error,
    });
    return false;
  }
}

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
    path.join(__dirname, '../../uploads/wallpapers/thumbnails'),
    path.join(__dirname, '../../uploads/apps'),
    path.join(__dirname, '../../uploads/apps/icons'),
    path.join(__dirname, '../../uploads/files'),
    path.join(__dirname, '../../uploads/message-images'),
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

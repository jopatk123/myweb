import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createUploadDirs() {
  const uploadDirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/wallpapers'),
    path.join(__dirname, '../../data'),
    path.join(__dirname, '../../logs')
  ];

  for (const dir of uploadDirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
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
    console.warn(`Failed to delete file: ${filePath}`, error.message);
    return false;
  }
}
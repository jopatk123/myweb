import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, '../..');
export const UPLOADS_ROOT = path.join(PROJECT_ROOT, 'uploads');
export const WALLPAPERS_DIR = path.join(UPLOADS_ROOT, 'wallpapers');
export const WALLPAPER_THUMBNAILS_DIR = path.join(WALLPAPERS_DIR, 'thumbnails');
export const FILES_DIR = path.join(UPLOADS_ROOT, 'files');

export function toUploadsAbsolutePath(filePath) {
  const candidate = String(filePath || '').trim();
  if (!candidate) return null;

  const absolutePath = path.isAbsolute(candidate)
    ? path.normalize(candidate)
    : path.resolve(PROJECT_ROOT, candidate);

  const relativeToUploads = path.relative(UPLOADS_ROOT, absolutePath);
  if (
    !relativeToUploads ||
    relativeToUploads === '' ||
    (!relativeToUploads.startsWith('..') && !path.isAbsolute(relativeToUploads))
  ) {
    return absolutePath;
  }

  return null;
}

export function toUploadsRelativePath(...segments) {
  return path.posix.join(
    'uploads',
    ...segments
      .filter(
        segment => segment !== undefined && segment !== null && segment !== ''
      )
      .map(segment =>
        String(segment)
          .replace(/\\/g, '/')
          .replace(/^\/+|\/+$/g, '')
      )
  );
}

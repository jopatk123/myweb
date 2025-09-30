/**
 * @fileoverview
 * Re-export database migration helpers from modular files.
 */

export { ensureWallpaperColumns } from './migrations/wallpapers.js';
export { ensureFilesTypeCategoryIncludesNovel } from './migrations/files.js';
export { ensureAppsColumns } from './migrations/apps.js';
export { ensureSnakeMultiplayerColumns } from './migrations/snakeMultiplayer.js';
export { ensureNovelRelations } from './migrations/novels.js';

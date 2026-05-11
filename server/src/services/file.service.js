import fs from 'fs/promises';
import { FileModel } from '../models/file.model.js';
import logger from '../utils/logger.js';
import { toUploadsAbsolutePath } from '../utils/upload-path.js';
import {
  buildFileUrl,
  detectTypeCategory,
  normalizeStoredPath,
  EXTENSION_TYPE_MAP,
  FILE_CATEGORIES,
  MIME_TYPE_MAP,
} from '../utils/file-metadata.js';

const fileServiceLogger = logger.child('FileService');
export {
  detectTypeCategory,
  FILE_CATEGORIES,
  MIME_TYPE_MAP,
  EXTENSION_TYPE_MAP,
};

export class FileService {
  constructor(db) {
    this.model = new FileModel(db);
  }

  list({ page = 1, limit = 20, type = null, search = null } = {}) {
    return this.model.findAll({ page, limit, type, search });
  }

  get(id) {
    const row = this.model.findById(id);
    if (!row) {
      const err = new Error('文件不存在');
      err.status = 404;
      throw err;
    }
    return row;
  }

  create({
    originalName,
    storedName,
    filePath,
    mimeType,
    fileSize,
    uploaderId,
    baseUrl = '',
    typeCategory: explicitTypeCategory = null,
  }) {
    const typeCategory =
      explicitTypeCategory || detectTypeCategory(mimeType, originalName);
    const normalizedPath = normalizeStoredPath(filePath);
    const fileUrl = buildFileUrl(baseUrl, normalizedPath);

    const payload = {
      originalName,
      storedName,
      filePath: normalizedPath,
      mimeType,
      fileSize,
      typeCategory,
      fileUrl,
      uploaderId,
    };
    // FileModel.create expects camelCase keys; pass payload directly
    return this.model.create(payload);
  }

  createMany(entries = []) {
    const items = Array.isArray(entries) ? entries : [entries];
    if (!items.length) return [];
    const txn = this.model.db.transaction(data =>
      data.map(item => this.create(item))
    );
    return txn(items);
  }

  async remove(id) {
    const file = this.get(id);
    const filePath = file.file_path;

    // 先删磁盘文件，再删数据库记录，避免 DB 已清而文件残留成孤儿文件
    const absolutePath = toUploadsAbsolutePath(filePath);
    if (!absolutePath) {
      fileServiceLogger.warn('拒绝删除非上传目录文件', { path: filePath });
    } else {
      try {
        await fs.unlink(absolutePath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          fileServiceLogger.warn('删除磁盘文件失败（已忽略）', {
            error: err?.message,
          });
        }
      }
    }

    this.model.delete(id);
    return true;
  }
}

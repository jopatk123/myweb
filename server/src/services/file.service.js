import fs from 'fs/promises';
import { FileModel } from '../models/file.model.js';
import logger from '../utils/logger.js';
import { toUploadsAbsolutePath } from '../utils/upload-path.js';
import { NotFoundError } from '../utils/errors.js';
import {
  buildFileUrl,
  detectTypeCategory,
  normalizeStoredPath,
} from '../utils/file-metadata.js';

const fileServiceLogger = logger.child('FileService');

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
      throw new NotFoundError('文件不存在');
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

  /**
   * 软删除文件：先在事务中标记 deleted_at，再异步清理磁盘文件
   *
   * 设计权衡：
   * - DB 软删除是事务原子操作，确保用户立即无法访问该文件
   * - 磁盘清理异步执行，失败仅记日志（孤儿文件可由后续清理任务处理）
   * - 相比"先删磁盘再删 DB"，避免磁盘删除成功但 DB 删除失败导致的孤儿记录
   * - 相比"先 DB 物理删除再删磁盘"，保留 DB 记录便于审计与磁盘清理失败时重试
   */
  async remove(id) {
    // includeDeleted=true 以便能拿到已软删记录的 filePath 进行磁盘清理
    // （兜底场景：上次软删除成功但磁盘清理失败）
    const file = this.model.findById(id, { includeDeleted: true });
    if (!file) {
      throw new NotFoundError('文件不存在');
    }

    // 已软删记录直接返回，避免重复清理
    if (file.deleted_at) {
      return true;
    }

    // 事务内软删除：原子操作，确保用户立即无法访问
    this.model.softDelete(id);

    // 事务外异步清理磁盘文件：失败仅记日志，不影响已完成的软删除
    this.scheduleDiskCleanup(file.file_path, id).catch(err => {
      fileServiceLogger.error('异步清理磁盘文件失败', {
        id,
        path: file.file_path,
        error: err?.message,
      });
    });

    return true;
  }

  /**
   * 异步清理磁盘文件
   * @param {string} storedPath 数据库中保存的相对路径
   * @param {number} id 文件 ID（用于日志）
   */
  async scheduleDiskCleanup(storedPath, id) {
    if (!storedPath) {
      fileServiceLogger.warn('磁盘清理跳过：文件路径缺失', { id });
      return;
    }

    const absolutePath = toUploadsAbsolutePath(storedPath);
    if (!absolutePath) {
      fileServiceLogger.warn('拒绝删除非上传目录文件', {
        id,
        path: storedPath,
      });
      return;
    }

    try {
      await fs.unlink(absolutePath);
      fileServiceLogger.debug('磁盘文件已清理', { id, path: storedPath });
    } catch (err) {
      if (err?.code === 'ENOENT') {
        // 文件已不存在，无需处理
        return;
      }
      // 其他错误向上抛出，由调用方记日志
      throw err;
    }
  }
}

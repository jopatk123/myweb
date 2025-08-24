import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { FileModel } from '../models/file.model.js';
import { NovelModel } from '../models/novel.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function detectTypeCategory(mimeType, originalName = '') {
  const mt = String(mimeType || '').toLowerCase();
  if (mt.startsWith('image/')) return 'image';
  if (mt.startsWith('video/')) return 'video';
  if (
    mt ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mt === 'application/msword' ||
    /\.(docx?|dotx?)$/i.test(originalName)
  )
    return 'word';
  if (
    mt ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mt === 'application/vnd.ms-excel' ||
    /\.(xlsx?|xlsm|xlsb)$/i.test(originalName)
  )
    return 'excel';
  if (
    mt === 'application/zip' ||
    mt === 'application/x-7z-compressed' ||
    mt === 'application/x-rar-compressed' ||
    /\.(zip|7z|rar)$/i.test(originalName)
  )
    return 'archive';
  return 'other';
}

export class FileService {
  constructor(db) {
    this.model = new FileModel(db);
    this.novelModel = new NovelModel(db);
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
    const normalizedPath = filePath.replace(/\\/g, '/');
    const fileUrl = `${baseUrl ? `${baseUrl}/` : ''}${normalizedPath}`.replace(
      /\/+/g,
      '/'
    );

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

  async remove(id) {
    // 使用事务确保原子性：删除磁盘文件、files 表记录、以及 novels 表关联记录
    const db = this.model.db; // better-sqlite3 Database
    const file = this.get(id);
    const filePath = file.file_path;

    const transaction = db.transaction(() => {
      // 从 files 表中删除记录
      this.model.delete(id);

      // 如果是小说类型，删除 novels 表中对应记录
      if (
        (file.type_category || file.typeCategory || '').toLowerCase() ===
        'novel'
      ) {
        this.novelModel.deleteByFilePath(filePath);
      }
    });

    try {
      // 删除磁盘文件（若存在）
      let diskPath = filePath;
      if (!path.isAbsolute(diskPath))
        diskPath = path.join(__dirname, '../../', filePath);
      try {
        await fs.unlink(diskPath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          // 若磁盘删除失败（非文件不存在），抛错以终止事务
          throw err;
        }
      }

      // 执行 DB 事务
      transaction();

      return true;
    } catch (error) {
      console.error('删除文件失败（回滚）：', error);
      throw error;
    }
  }
}

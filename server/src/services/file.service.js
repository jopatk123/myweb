import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { FileModel } from '../models/file.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function detectTypeCategory(mimeType, originalName = '') {
  const mt = String(mimeType || '').toLowerCase();
  if (mt.startsWith('image/')) return 'image';
  if (mt.startsWith('video/')) return 'video';
  if (mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mt === 'application/msword' || /\.(docx?|dotx?)$/i.test(originalName)) return 'word';
  if (mt === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mt === 'application/vnd.ms-excel' || /\.(xlsx?|xlsm|xlsb)$/i.test(originalName)) return 'excel';
  if (mt === 'application/zip' || mt === 'application/x-7z-compressed' || mt === 'application/x-rar-compressed' || /\.(zip|7z|rar)$/i.test(originalName)) return 'archive';
  return 'other';
}

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

  create({ originalName, storedName, filePath, mimeType, fileSize, uploaderId, baseUrl = '' }) {
    const typeCategory = detectTypeCategory(mimeType, originalName);
    const normalizedPath = filePath.replace(/\\/g, '/');
    const fileUrl = `${baseUrl ? `${baseUrl}/` : ''}${normalizedPath}`.replace(/\/+/g, '/');

    return this.model.create({
      originalName,
      storedName,
      filePath: normalizedPath,
      mimeType,
      fileSize,
      typeCategory,
      fileUrl,
      uploaderId
    });
  }

  async remove(id) {
    const file = this.get(id);
    // 将相对 web 路径解析为磁盘路径
    let diskPath = file.file_path;
    if (!path.isAbsolute(diskPath)) {
      diskPath = path.join(__dirname, '../../', file.file_path);
    }
    try {
      await fs.unlink(diskPath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('删除文件失败:', error.message);
      }
    }
    this.model.delete(id);
    return true;
  }
}



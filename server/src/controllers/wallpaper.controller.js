import { WallpaperService } from '../services/wallpaper.service.js';
import { createReadStream } from 'fs';
import { normalizeKeys } from '../utils/case-helper.js';
import { parseEnvByteSize } from '../utils/env.js';
import { createUploader, imageOnlyFilter } from '../utils/uploader.js';
import { DEFAULT_WALLPAPER_MAX_SIZE } from '../constants/limits.js';
import { WALLPAPERS_DIR, toUploadsRelativePath } from '../utils/upload-path.js';
import { streamWallpaperDownload } from './wallpaper/wallpaper-download.js';

function sanitizePositiveIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return ids.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0);
}

const upload = createUploader({
  destination: WALLPAPERS_DIR,
  maxFileSize: parseEnvByteSize(
    'WALLPAPER_MAX_UPLOAD_SIZE',
    DEFAULT_WALLPAPER_MAX_SIZE
  ),
  fileFilter: imageOnlyFilter,
});

export class WallpaperController {
  constructor(db) {
    this.service = new WallpaperService(db);
    this.upload = upload;
  }

  async getWallpapers(req, res, next) {
    try {
      const { groupId, page, limit } = req.query;
      if (page && limit) {
        const pageNum = Number(page) || 1;
        const lim = Number(limit) || 20;
        const result = await this.service.getAllWallpapers(
          groupId,
          pageNum,
          lim
        );
        res.json({ code: 200, data: result, message: '获取成功' });
      } else {
        const wallpapers = await this.service.getAllWallpapers(groupId);
        res.json({ code: 200, data: wallpapers, message: '获取成功' });
      }
    } catch (error) {
      next(error);
    }
  }

  async getWallpaperThumbnail(req, res, next) {
    try {
      const { id } = req.params;
      const { w, width, h, height, format, f } = req.query;

      const options = {
        width: w ?? width,
        height: h ?? height,
        format: format ?? f,
      };

      const result = await this.service.getWallpaperThumbnail(id, options);
      const { filePath, mimeType, etag, lastModified, size } = result;

      const cacheControl = 'private, max-age=2592000, immutable';
      const ifNoneMatch = req.headers['if-none-match'];

      if (ifNoneMatch && ifNoneMatch.split(/,\s*/).includes(etag)) {
        res.set({
          'Cache-Control': cacheControl,
          ETag: etag,
          'Last-Modified': lastModified,
        });
        return res.status(304).end();
      }

      res.set({
        'Content-Type': mimeType,
        'Content-Length': size,
        'Cache-Control': cacheControl,
        ETag: etag,
        'Last-Modified': lastModified,
      });

      const stream = createReadStream(filePath);
      stream.on('error', error => next(error));
      return stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  async getWallpaper(req, res, next) {
    try {
      const { id } = req.params;
      const wallpaper = await this.service.getWallpaperById(id);
      res.json({ code: 200, data: wallpaper, message: '获取成功' });
    } catch (error) {
      next(error);
    }
  }

  async uploadWallpaper(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ code: 400, message: '请选择文件' });
      }

      // multer 不会经过全局中间件归一化，需手动转换键名
      const normalizedBody = normalizeKeys(req.body || {});
      const { groupId, name } = normalizedBody;
      const webPath = toUploadsRelativePath('wallpapers', req.file.filename);

      const fileData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: webPath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        name: name || req.file.originalname,
      };

      const wallpaper = await this.service.uploadWallpaper(fileData, groupId);
      res.status(201).json({ code: 201, data: wallpaper, message: '上传成功' });
    } catch (error) {
      next(error);
    }
  }

  async updateWallpaper(req, res, next) {
    try {
      const { id } = req.params;
      const wallpaper = await this.service.updateWallpaper(id, req.body);
      res.json({ code: 200, data: wallpaper, message: '更新成功' });
    } catch (error) {
      next(error);
    }
  }

  async deleteWallpaper(req, res, next) {
    try {
      const { id } = req.params;
      await this.service.deleteWallpaper(id);
      res.json({ code: 200, message: '删除成功' });
    } catch (error) {
      next(error);
    }
  }

  async deleteWallpapers(req, res, next) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 400, message: '请提供壁纸ID' });
      }
      const sanitizedIds = sanitizePositiveIds(ids);
      if (sanitizedIds.length === 0) {
        return res.status(400).json({ code: 400, message: '提供的壁纸ID无效' });
      }
      await this.service.deleteMultipleWallpapers(sanitizedIds);
      res.json({ code: 200, message: '批量删除成功' });
    } catch (error) {
      next(error);
    }
  }

  async moveWallpapers(req, res, next) {
    try {
      const { ids } = req.body;
      let groupId = req.body.groupId;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 400, message: '请提供壁纸ID' });
      }
      if (groupId === undefined) {
        return res.status(400).json({ code: 400, message: '请提供目标分组ID' });
      }
      const sanitizedIds = sanitizePositiveIds(ids);
      if (sanitizedIds.length === 0) {
        return res.status(400).json({ code: 400, message: '提供的壁纸ID无效' });
      }
      if (groupId !== null && groupId !== undefined && groupId !== '') {
        groupId = Number(groupId);
      }
      await this.service.moveMultipleWallpapers(sanitizedIds, groupId);
      res.json({ code: 200, message: '批量移动成功' });
    } catch (error) {
      next(error);
    }
  }

  async setActiveWallpaper(req, res, next) {
    try {
      const { id } = req.params;
      await this.service.setActiveWallpaper(id);
      res.json({ code: 200, message: '设置成功' });
    } catch (error) {
      next(error);
    }
  }

  async getActiveWallpaper(req, res, next) {
    try {
      const wallpaper = await this.service.getActiveWallpaper();
      res.json({ code: 200, data: wallpaper, message: '获取成功' });
    } catch (error) {
      next(error);
    }
  }

  async getRandomWallpaper(req, res, next) {
    try {
      const { groupId } = req.query;
      const wallpaper = await this.service.getRandomWallpaper(groupId);
      res.json({
        code: 200,
        data: wallpaper,
        message: wallpaper ? '获取成功' : '该分组暂无壁纸',
      });
    } catch (error) {
      next(error);
    }
  }

  async getGroups(req, res, next) {
    try {
      const groups = await this.service.getAllGroups();
      res.json({ code: 200, data: groups, message: '获取成功' });
    } catch (error) {
      next(error);
    }
  }

  async createGroup(req, res, next) {
    try {
      const group = await this.service.createGroup(req.body);
      res.status(201).json({ code: 201, data: group, message: '创建成功' });
    } catch (error) {
      next(error);
    }
  }

  async updateGroup(req, res, next) {
    try {
      const { id } = req.params;
      const group = await this.service.updateGroup(id, req.body);
      res.json({ code: 200, data: group, message: '更新成功' });
    } catch (error) {
      next(error);
    }
  }

  async deleteGroup(req, res, next) {
    try {
      const { id } = req.params;
      await this.service.deleteGroup(id);
      res.json({ code: 200, message: '删除成功' });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentGroup(req, res, next) {
    try {
      const group = await this.service.getCurrentGroup();
      res.json({ code: 200, data: group, message: '获取成功' });
    } catch (error) {
      next(error);
    }
  }

  async downloadWallpapers(req, res, next) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 400, message: '请提供壁纸ID' });
      }
      const sanitizedIds = sanitizePositiveIds(ids);
      if (sanitizedIds.length === 0) {
        return res.status(400).json({ code: 400, message: '提供的壁纸ID无效' });
      }

      const wallpapers = await this.service.getWallpapersByIds(sanitizedIds);
      if (wallpapers.length === 0) {
        return res
          .status(404)
          .json({ code: 404, message: '没有找到指定的壁纸' });
      }

      await streamWallpaperDownload(res, wallpapers);
    } catch (error) {
      next(error);
    }
  }

  async setCurrentGroup(req, res, next) {
    try {
      const { id } = req.params;
      const group = await this.service.setCurrentGroup(id);
      res.json({ code: 200, data: group, message: '设置成功' });
    } catch (error) {
      next(error);
    }
  }
}

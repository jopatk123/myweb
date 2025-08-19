import { WallpaperService } from '../services/wallpaper.service.js';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

// 解析当前模块目录（ESM 无 __dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/wallpapers'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'), false);
    }
  }
});

export class WallpaperController {
  constructor(db) {
    this.service = new WallpaperService(db);
    this.upload = upload;
  }

  // 获取所有壁纸
  async getWallpapers(req, res, next) {
    try {
      const { groupId } = req.query;
      const wallpapers = await this.service.getAllWallpapers(groupId);
      res.json({
        code: 200,
        data: wallpapers,
        message: '获取成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取单个壁纸
  async getWallpaper(req, res, next) {
    try {
      const { id } = req.params;
      const wallpaper = await this.service.getWallpaperById(id);
      res.json({
        code: 200,
        data: wallpaper,
        message: '获取成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 上传壁纸
  async uploadWallpaper(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          code: 400,
          message: '请选择文件'
        });
      }

      const { groupId, name } = req.body;
      // 存储到数据库的 file_path 应为 web 可访问的相对路径（例如: uploads/wallpapers/<filename>）
      // 这样前端可以直接用 `${API_BASE}/${file_path}` 访问；同时删除时再解析到磁盘路径
      const webPath = path.posix.join('uploads', 'wallpapers', req.file.filename);

      const fileData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: webPath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        name: name || req.file.originalname // 如果没有提供名称，则使用原始文件名
      };

      const wallpaper = await this.service.uploadWallpaper(fileData, groupId);
      res.status(201).json({
        code: 201,
        data: wallpaper,
        message: '上传成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 更新壁纸信息
  async updateWallpaper(req, res, next) {
    try {
      const { id } = req.params;
      // 移除不再支持的字段
      const data = { ...req.body };
      if (data.description !== undefined) delete data.description;
      const wallpaper = await this.service.updateWallpaper(id, data);
      res.json({
        code: 200,
        data: wallpaper,
        message: '更新成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 删除壁纸
  async deleteWallpaper(req, res, next) {
    try {
      const { id } = req.params;
      await this.service.deleteWallpaper(id);
      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 批量删除壁纸
  async deleteWallpapers(req, res, next) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 400, message: '请提供壁纸ID' });
      }
      await this.service.deleteMultipleWallpapers(ids);
      res.json({
        code: 200,
        message: '批量删除成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 批量移动壁纸
  async moveWallpapers(req, res, next) {
    try {
      const { ids, groupId } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ code: 400, message: '请提供壁纸ID' });
      }
      if (groupId === undefined) {
        return res.status(400).json({ code: 400, message: '请提供目标分组ID' });
      }
      await this.service.moveMultipleWallpapers(ids, groupId);
      res.json({
        code: 200,
        message: '批量移动成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 设置活跃壁纸
  async setActiveWallpaper(req, res, next) {
    try {
      const { id } = req.params;
      await this.service.setActiveWallpaper(id);
      res.json({
        code: 200,
        message: '设置成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取当前活跃壁纸
  async getActiveWallpaper(req, res, next) {
    try {
      const wallpaper = await this.service.getActiveWallpaper();
      res.json({
        code: 200,
        data: wallpaper,
        message: '获取成功'
      });
    } catch (error) {
      next(error);
    }
  }

  // 随机获取壁纸
  async getRandomWallpaper(req, res, next) {
    try {
      const { groupId } = req.query;
      const wallpaper = await this.service.getRandomWallpaper(groupId);
      res.json({
        code: 200,
        data: wallpaper,
        message: wallpaper ? '获取成功' : '该分组暂无壁纸'
      });
    } catch (error) {
      next(error);
    }
  }

  // 分组相关方法
  async getGroups(req, res, next) {
    try {
      const groups = await this.service.getAllGroups();
      res.json({
        code: 200,
        data: groups,
        message: '获取成功'
      });
    } catch (error) {
      next(error);
    }
  }

  async createGroup(req, res, next) {
    try {
      const group = await this.service.createGroup(req.body);
      res.status(201).json({
        code: 201,
        data: group,
        message: '创建成功'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateGroup(req, res, next) {
    try {
      const { id } = req.params;
      const group = await this.service.updateGroup(id, req.body);
      res.json({
        code: 200,
        data: group,
        message: '更新成功'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteGroup(req, res, next) {
    try {
      const { id } = req.params;
      await this.service.deleteGroup(id);
      res.json({
        code: 200,
        message: '删除成功'
      });
    } catch (error) {
      next(error);
    }
  }
}
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { MusicService } from '../services/music.service.js';
import { parseEnvByteSize, parseEnvNumber } from '../utils/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const musicDir = path.join(__dirname, '../../uploads/music');

if (!fs.existsSync(musicDir)) {
  try {
    fs.mkdirSync(musicDir, { recursive: true });
  } catch (err) {
    console.warn('无法创建 music 上传目录:', err?.message || err);
  }
}

const DEFAULT_MUSIC_UPLOAD_SIZE = 1024 * 1024 * 1024; // 1GB
const DEFAULT_MUSIC_UPLOAD_FILES = 20;

const MUSIC_UPLOAD_SIZE = parseEnvByteSize(
  'MUSIC_MAX_UPLOAD_SIZE',
  DEFAULT_MUSIC_UPLOAD_SIZE
);
const MUSIC_UPLOAD_FILES = Math.max(
  1,
  parseEnvNumber('MUSIC_MAX_UPLOAD_FILES', DEFAULT_MUSIC_UPLOAD_FILES)
);

const storageMusic = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, musicDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const uploadMusic = multer({
  storage: storageMusic,
  limits: { fileSize: MUSIC_UPLOAD_SIZE },
});

function serializeTrack(track, req) {
  if (!track) return track;
  const baseUrl = req.baseUrl || '/api/music';
  const streamPath = `${baseUrl}/tracks/${track.id}/stream`;
  const downloadPath = track.file_id
    ? `/api/files/${track.file_id}/download`
    : null;

  return {
    ...track,
    stream_url: streamPath,
    download_url: downloadPath,
  };
}

export function createMusicRoutes(db) {
  const router = express.Router();
  const service = new MusicService(db);

  router.post(
    '/upload',
    uploadMusic.array('file', MUSIC_UPLOAD_FILES),
    async (req, res, next) => {
      try {
        const baseUrl = (req.get('x-api-base') || '').trim();
        const files = req.files || [];
        if (!files.length) {
          return res
            .status(400)
            .json({ code: 400, success: false, message: '请选择文件' });
        }

        const created = [];
        for (const file of files) {
          const { trackRow } = await service.createTrackFromUpload(file, {
            baseUrl,
          });
          created.push(trackRow);
        }

        const data = created.length === 1 ? created[0] : created;
        res.status(201).json({
          code: 201,
          success: true,
          data: Array.isArray(data)
            ? data.map(item => serializeTrack(item, req))
            : serializeTrack(data, req),
          message: '音乐上传成功',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get('/tracks', async (req, res, next) => {
    try {
      const { page = 1, limit = 50, search = '' } = req.query;
      const result = service.list({
        page: Number(page),
        limit: Number(limit),
        search: String(search || ''),
      });
      res.json({
        code: 200,
        success: true,
        data: {
          tracks: result.items.map(item => serializeTrack(item, req)),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: result.total,
            totalPages: Math.ceil(result.total / Number(limit || 1)),
          },
        },
        message: '获取成功',
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tracks/:id', async (req, res, next) => {
    try {
      const track = service.get(Number(req.params.id));
      res.json({
        code: 200,
        success: true,
        data: serializeTrack(track, req),
        message: '获取成功',
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/tracks/:id', async (req, res, next) => {
    try {
      const updated = service.updateTrack(
        Number(req.params.id),
        req.body || {}
      );
      res.json({
        code: 200,
        success: true,
        data: serializeTrack(updated, req),
        message: '更新成功',
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/tracks/:id', async (req, res, next) => {
    try {
      await service.deleteTrack(Number(req.params.id));
      res.json({ code: 200, success: true, message: '删除成功' });
    } catch (error) {
      next(error);
    }
  });

  router.get('/tracks/:id/stream', async (req, res, next) => {
    try {
      const track = service.get(Number(req.params.id));
      const filePath = service.resolveDiskPath(track);
      const stat = await fsPromises.stat(filePath);
      const total = stat.size;
      const range = req.headers.range;
      const mimeType = track.mime_type || 'audio/mpeg';

      if (range) {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        const start = match ? Number(match[1]) : 0;
        const end = match && match[2] ? Number(match[2]) : total - 1;
        const chunkSize = end - start + 1;

        const stream = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mimeType,
          'Cache-Control': 'no-cache',
        });
        stream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': total,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}

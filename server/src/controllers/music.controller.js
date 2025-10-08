import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import crypto from 'crypto';
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

let ffmpegLoaderPromise = null;
async function loadFfmpeg() {
  if (!ffmpegLoaderPromise) {
    ffmpegLoaderPromise = (async () => {
      try {
        const ffmpegMod = await import('fluent-ffmpeg');
        const ffmpegStatic = await import('ffmpeg-static');
        const ffmpegInstance = ffmpegMod.default || ffmpegMod;
        const staticPath = ffmpegStatic?.default || ffmpegStatic;
        if (staticPath && ffmpegInstance?.setFfmpegPath) {
          ffmpegInstance.setFfmpegPath(staticPath);
        }
        return ffmpegInstance;
      } catch (error) {
        console.warn(
          'FFmpeg 模块加载失败，已回退为直接文件流:',
          error?.message || error
        );
        return null;
      }
    })();
  }
  return ffmpegLoaderPromise;
}

function safeParseJson(input) {
  if (!input) return null;
  if (typeof input === 'object') return input;
  try {
    return JSON.parse(input);
  } catch (err) {
    console.warn('解析 JSON 失败:', err?.message || err);
    return null;
  }
}

function parseCompressionPayload(raw) {
  const data = safeParseJson(raw);
  if (!data || typeof data !== 'object') return null;
  return {
    strategy: data.strategy || data.compressionStrategy || null,
    originalBitrate: data.originalBitrate ?? data.original_bitrate ?? null,
    transcodeProfile: data.transcodeProfile || null,
  };
}

function computeEtag(stat, extraSeed = '') {
  const hash = crypto
    .createHash('sha1')
    .update(String(stat.size))
    .update(String(stat.mtimeMs))
    .update(String(extraSeed || ''))
    .digest('hex');
  return `"${hash}"`;
}

function serializeTrack(track, req) {
  if (!track) return track;
  const baseUrl = req.baseUrl || '/api/music';
  const streamPath = `${baseUrl}/tracks/${track.id}/stream`;
  const downloadPath = track.file_id
    ? `/api/files/${track.file_id}/download`
    : null;

  return {
    ...track,
    group: track.group_id
      ? {
          id: track.group_id,
          name: track.group_name || '默认歌单',
          isDefault: !!track.group_is_default,
        }
      : null,
    compression: {
      strategy: track.compression_strategy || null,
      originalBitrate: track.original_bitrate || null,
      transcodeProfile: track.transcode_profile || null,
    },
    stream_url: streamPath,
    download_url: downloadPath,
  };
}

function serializeGroup(group) {
  if (!group) return null;
  return {
    id: group.id,
    name: group.name,
    isDefault: !!group.is_default,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    trackCount: group.trackCount ?? 0,
  };
}

export function createMusicRoutes(db) {
  const router = express.Router();
  const service = new MusicService(db);
  service.ensureDefaultGroup();

  router.get('/groups', (req, res, next) => {
    try {
      const groups = service.listGroupsWithCounts().map(serializeGroup);
      res.json({
        code: 200,
        success: true,
        data: groups,
        message: '获取歌单分组成功',
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/groups', (req, res, next) => {
    try {
      const group = service.createGroup(req.body?.name ?? req.body?.groupName);
      res.status(201).json({
        code: 201,
        success: true,
        data: serializeGroup({ ...group, trackCount: 0 }),
        message: '歌单创建成功',
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/groups/:id', (req, res, next) => {
    try {
      const group = service.renameGroup(Number(req.params.id), req.body?.name);
      res.json({
        code: 200,
        success: true,
        data: serializeGroup(group),
        message: '歌单更新成功',
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/groups/:id', (req, res, next) => {
    try {
      service.deleteGroup(Number(req.params.id));
      res.json({ code: 200, success: true, message: '歌单删除成功' });
    } catch (error) {
      next(error);
    }
  });

  router.post('/tracks/:id/move', (req, res, next) => {
    try {
      const track = service.moveTrackToGroup(
        Number(req.params.id),
        req.body?.groupId ?? req.body?.targetGroupId
      );
      res.json({
        code: 200,
        success: true,
        data: serializeTrack(track, req),
        message: '移动成功',
      });
    } catch (error) {
      next(error);
    }
  });

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

        const groupId = req.body?.groupId ?? req.body?.group_id ?? null;
        const metadataPayload = safeParseJson(req.body?.metadata);
        const compressionPayload =
          parseCompressionPayload(
            req.body?.compression ||
              req.body?.compressionInfo ||
              metadataPayload?.compression
          ) || null;

        const created = [];
        for (const file of files) {
          const { trackRow } = await service.createTrackFromUpload(file, {
            baseUrl,
            groupId,
            compression: compressionPayload,
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
      const { page = 1, limit = 50, search = '', groupId = null } = req.query;
      const parsedGroupId =
        groupId === null || groupId === undefined || groupId === ''
          ? null
          : Number(groupId);
      const result = service.list({
        page: Number(page),
        limit: Number(limit),
        search: String(search || ''),
        groupId: Number.isNaN(parsedGroupId) ? null : parsedGroupId,
      });
      const includeGroups = String(
        req.query?.includeGroups || ''
      ).toLowerCase();
      const groupsPayload =
        includeGroups === 'true'
          ? service.listGroupsWithCounts().map(serializeGroup)
          : undefined;
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
          groups: groupsPayload,
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
      const etag = computeEtag(stat, track.updated_at || track.updatedAt);
      res.setHeader('ETag', etag);
      res.setHeader('Last-Modified', stat.mtime.toUTCString());
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader(
        'Cache-Control',
        'public, max-age=86400, stale-while-revalidate=43200'
      );

      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }

      const requestedFormat = String(
        req.query?.format || req.query?.transcode || ''
      ).toLowerCase();
      if (requestedFormat && requestedFormat !== 'original') {
        const ffmpeg = await loadFfmpeg();
        if (ffmpeg) {
          res.status(200);
          res.setHeader('Content-Type', 'audio/webm; codecs="opus"');
          res.setHeader('X-Transcoded', 'opus');
          const command = ffmpeg(filePath)
            .format('webm')
            .audioCodec('libopus')
            .audioBitrate('128k')
            .on('error', err => {
              console.error('FFmpeg 转码失败:', err);
              if (!res.headersSent) {
                next(err);
              } else {
                res.destroy(err);
              }
            });
          command.pipe(res, { end: true });
          return;
        }
      }

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
          'Cache-Control':
            'public, max-age=86400, stale-while-revalidate=43200',
        });
        stream.on('error', err => {
          stream.close();
          next(err);
        });
        stream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': total,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Cache-Control':
            'public, max-age=86400, stale-while-revalidate=43200',
        });
        const readStream = fs.createReadStream(filePath);
        readStream.on('error', err => {
          readStream.close();
          next(err);
        });
        readStream.pipe(res);
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
}

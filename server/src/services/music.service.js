import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import ffmpeg from 'fluent-ffmpeg';
import { MusicTrackModel } from '../models/music-track.model.js';
import { MusicGroupModel } from '../models/music-group.model.js';
import { FileService } from './file.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.join(__dirname, '../../uploads');
const musicDir = path.join(uploadsRoot, 'music');

let _ffmpegConfigured = false;

async function configureFfmpegIfNeeded() {
  if (_ffmpegConfigured) return;
  _ffmpegConfigured = true;

  try {
    const mod = await import('ffmpeg-static');
    const ffmpegPath = mod?.default ?? mod;
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }
  } catch (err) {
    // 在 Alpine 等环境下 ffmpeg-static 可能无法加载；回退为使用系统 ffmpeg（若存在）
    console.warn(
      'ffmpeg-static 加载失败，将回退为系统 ffmpeg（若存在）:',
      err?.message || err
    );
  }
}

function ensureAbsolutePath(relativePath) {
  if (!relativePath) return null;
  if (path.isAbsolute(relativePath)) return relativePath;
  return path.join(__dirname, '../../', relativePath);
}

export class MusicService {
  constructor(db) {
    this.db = db;
    this.model = new MusicTrackModel(db);
    this.groupModel = new MusicGroupModel(db);
    this.fileService = new FileService(db);
    this.parseFileLoader = null;
    this.metadataWarningLogged = false;
  }

  guessMimeFromExtension(filename) {
    const ext = path.extname(String(filename || '').trim()).toLowerCase();
    switch (ext) {
      case '.mp3':
        return 'audio/mpeg';
      case '.wav':
        return 'audio/wav';
      case '.flac':
        return 'audio/flac';
      case '.ogg':
        return 'audio/ogg';
      case '.opus':
        return 'audio/ogg; codecs=opus';
      case '.m4a':
      case '.aac':
        return 'audio/aac';
      case '.webm':
        return 'audio/webm';
      default:
        return null;
    }
  }

  async ensureUploadsDir() {
    try {
      await fs.mkdir(musicDir, { recursive: true });
    } catch (err) {
      if (err && err.code !== 'EEXIST') {
        console.warn('确保音乐上传目录失败:', err?.message || err);
      }
    }
  }

  list({ page = 1, limit = 20, search = '', groupId = null } = {}) {
    return this.model.findAll({ page, limit, search, groupId });
  }

  get(id) {
    const track = this.model.findById(id);
    if (!track) {
      const err = new Error('音乐不存在');
      err.status = 404;
      throw err;
    }
    return track;
  }

  getByFileId(fileId) {
    return this.model.findByFileId(fileId);
  }

  resolveDiskPath(track) {
    const relative = track?.file_path || track?.filePath;
    const abs = ensureAbsolutePath(relative);
    if (!abs) {
      const err = new Error('音乐文件路径无效');
      err.status = 500;
      throw err;
    }
    return abs;
  }

  async parseMetadata(filePath) {
    const parseFile = await this.loadMusicMetadata();
    if (!parseFile) {
      return {};
    }
    try {
      const metadata = await parseFile(filePath, { duration: true });
      return metadata || {};
    } catch (err) {
      console.warn('解析音频元数据失败:', filePath, err?.message || err);
      return {};
    }
  }

  async loadMusicMetadata() {
    if (this.parseFileLoader === null) {
      try {
        const mod = await import('music-metadata');
        const parse = mod?.parseFile || mod?.default?.parseFile || mod?.default;
        this.parseFileLoader = typeof parse === 'function' ? parse : null;
      } catch (err) {
        if (!this.metadataWarningLogged) {
          console.warn(
            'music-metadata 未安装或无法加载，已跳过元数据解析:',
            err?.message || err
          );
          this.metadataWarningLogged = true;
        }
        this.parseFileLoader = null;
      }
    }
    return this.parseFileLoader;
  }

  buildTrackPayload({ file, metadata, baseUrl }) {
    const compression = metadata?.compression || null;
    const common = metadata?.common || {};
    const format = metadata?.format || {};

    const titleFromFile = (file.originalname || '')
      .replace(/\.[^/.]+$/, '')
      .trim();

    const artists = Array.isArray(common.artists)
      ? common.artists.filter(Boolean).join(', ')
      : common.artist || '';

    const genres = Array.isArray(common.genre)
      ? common.genre.filter(Boolean).join(', ')
      : common.genre || '';

    const durationSeconds = format.duration
      ? Math.round(format.duration)
      : null;
    const bitrate = format.bitrate ? Math.round(format.bitrate) : null;
    const sampleRate = format.sampleRate ? Math.round(format.sampleRate) : null;

    const trackNumber =
      common.track && typeof common.track.no === 'number'
        ? common.track.no
        : (common.track?.no ?? null);

    const discNumber =
      common.disk && typeof common.disk.no === 'number'
        ? common.disk.no
        : (common.disk?.no ?? null);

    const normalizedPath = path.posix.join('uploads', 'music', file.filename);
    const sanitizedBase = baseUrl ? baseUrl.replace(/\/+$/g, '') : '';
    const rawUrl = sanitizedBase
      ? `${sanitizedBase}/${normalizedPath}`
      : normalizedPath;
    const fileUrl = rawUrl.replace(/\/{2,}/g, '/');

    const inferredMime =
      file.mimetype ||
      format?.mimeType ||
      this.guessMimeFromExtension(file.originalname || file.filename) ||
      null;

    return {
      title: (common.title || titleFromFile || '未命名').trim(),
      artist: artists || '未知艺术家',
      album: common.album || '',
      genre: genres || '',
      durationSeconds,
      bitrate,
      sampleRate,
      trackNumber,
      discNumber,
      year: common.year || null,
      originalName: file.originalname,
      storedName: file.filename,
      filePath: normalizedPath,
      mimeType: inferredMime || 'application/octet-stream',
      fileSize: file.size,
      fileUrl,
      uploaderId: null,
      groupId: metadata?.groupId ?? null,
      compressionStrategy: compression?.strategy ?? null,
      originalBitrate:
        compression?.originalBitrate ??
        compression?.original_bitrate ??
        bitrate,
      transcodeProfile: compression?.transcodeProfile ?? null,
    };
  }

  createFileRecord({ file, baseUrl }) {
    const webPath = path.posix.join('uploads', 'music', file.filename);
    const inferredMime =
      file.mimetype ||
      this.guessMimeFromExtension(file.originalname || file.filename) ||
      'application/octet-stream';

    return this.fileService.create({
      originalName: file.originalname,
      storedName: file.filename,
      filePath: webPath,
      mimeType: inferredMime,
      fileSize: file.size,
      uploaderId: null,
      baseUrl,
      typeCategory: 'music',
    });
  }

  ensureDefaultGroup() {
    const existing = this.groupModel.findDefault();
    if (existing) return existing;
    return this.groupModel.create({ name: '默认歌单', isDefault: true });
  }

  resolveGroupIdInput(groupId) {
    if (groupId === undefined || groupId === null || groupId === '') {
      return null;
    }
    const numeric = Number(groupId);
    if (Number.isNaN(numeric)) {
      return null;
    }
    return numeric;
  }

  getGroupOrDefault(groupId) {
    const resolved = this.resolveGroupIdInput(groupId);
    if (resolved === null) {
      return this.ensureDefaultGroup();
    }
    const group = this.groupModel.findById(resolved);
    if (!group || group.deleted_at) {
      const err = new Error('歌单分组不存在');
      err.status = 400;
      throw err;
    }
    return group;
  }

  listGroupsWithCounts() {
    const groups = this.groupModel.findAll();
    const counts = this.db
      .prepare(
        `SELECT group_id AS groupId, COUNT(1) AS total
         FROM music_tracks
         GROUP BY group_id`
      )
      .all();
    const countMap = counts.reduce((acc, row) => {
      acc[row.groupId ?? 'null'] = row.total;
      return acc;
    }, {});
    return groups.map(group => ({
      ...group,
      trackCount: countMap[group.id] ?? 0,
    }));
  }

  createGroup(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      const err = new Error('歌单名称不能为空');
      err.status = 400;
      throw err;
    }
    return this.groupModel.create({ name: trimmed, isDefault: false });
  }

  renameGroup(id, name) {
    const group = this.groupModel.findById(id);
    if (!group || group.deleted_at) {
      const err = new Error('歌单不存在');
      err.status = 404;
      throw err;
    }
    if (group.is_default) {
      const err = new Error('不能修改默认歌单名称');
      err.status = 400;
      throw err;
    }
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      const err = new Error('歌单名称不能为空');
      err.status = 400;
      throw err;
    }
    return this.groupModel.update(id, { name: trimmed });
  }

  deleteGroup(id) {
    const group = this.groupModel.findById(id);
    if (!group || group.deleted_at) {
      const err = new Error('歌单不存在');
      err.status = 404;
      throw err;
    }
    if (group.is_default) {
      const err = new Error('不能删除默认歌单');
      err.status = 400;
      throw err;
    }
    const defaultGroup = this.ensureDefaultGroup();
    this.db
      .prepare('UPDATE music_tracks SET group_id = ? WHERE group_id = ?')
      .run(defaultGroup.id, id);
    return this.groupModel.softDelete(id);
  }

  moveTrackToGroup(trackId, groupId) {
    const track = this.get(trackId);
    const group = this.getGroupOrDefault(groupId);
    this.model.update(track.id, { groupId: group.id });
    return this.model.findById(track.id);
  }

  async compressAudioIfNeeded(inputPath, originalFile) {
    const MIN_SIZE_FOR_COMPRESSION = 4 * 1024 * 1024; // 4MB
    const TARGET_BITRATE = 128; // kbps
    const originalMime = originalFile?.mimetype || null;

    const stats = await fs.stat(inputPath);
    if (stats.size < MIN_SIZE_FOR_COMPRESSION) {
      return {
        compressed: false,
        path: inputPath,
        metadata: null,
        mimeType: originalMime,
      };
    }

    const ext = path.extname(originalFile.originalname || '').toLowerCase();
    const shouldCompress =
      ['.flac', '.wav', '.ape', '.alac'].includes(ext) ||
      stats.size >= MIN_SIZE_FOR_COMPRESSION;

    if (!shouldCompress) {
      return {
        compressed: false,
        path: inputPath,
        metadata: null,
        mimeType: originalMime,
      };
    }

    try {
      await configureFfmpegIfNeeded();
      const compressedName = `${path.basename(inputPath, path.extname(inputPath))}_compressed.opus`;
      const compressedPath = path.join(musicDir, compressedName);

      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .toFormat('opus')
          .audioBitrate(TARGET_BITRATE)
          .audioCodec('libopus')
          .outputOptions(['-vn', '-vbr on'])
          .on('end', resolve)
          .on('error', reject)
          .save(compressedPath);
      });

      const compressedStats = await fs.stat(compressedPath);
      if (compressedStats.size < stats.size * 0.9) {
        try {
          await fs.unlink(inputPath);
        } catch (err) {
          console.warn('删除原始文件失败:', err?.message || err);
        }

        return {
          compressed: true,
          path: compressedPath,
          metadata: {
            strategy: 'server-ffmpeg-opus-128k',
            originalBitrate: null,
            transcodeProfile: `opus@${TARGET_BITRATE}k`,
          },
          mimeType: 'audio/ogg; codecs=opus',
        };
      }

      try {
        await fs.unlink(compressedPath);
      } catch (err) {
        console.warn('删除压缩文件失败:', err?.message || err);
      }
      return {
        compressed: false,
        path: inputPath,
        metadata: null,
        mimeType: originalMime,
      };
    } catch (err) {
      console.warn('音频压缩失败，使用原始文件:', err?.message || err);
      return {
        compressed: false,
        path: inputPath,
        metadata: null,
        mimeType: originalMime,
      };
    }
  }

  async createTrackFromUpload(
    file,
    { baseUrl = '', groupId = null, compression = null } = {}
  ) {
    await this.ensureUploadsDir();
    const absolutePath = path.join(musicDir, file.filename);

    const compressionResult = await this.compressAudioIfNeeded(
      absolutePath,
      file
    );
    const finalPath = compressionResult.path;
    const finalFilename = path.basename(finalPath);
    const compressionMeta = compressionResult.metadata || compression;

    const inferredMime =
      compressionResult.mimeType ||
      file.mimetype ||
      this.guessMimeFromExtension(finalFilename) ||
      this.guessMimeFromExtension(file.originalname) ||
      null;

    const updatedFile = {
      ...file,
      filename: finalFilename,
      path: finalPath,
      size: (await fs.stat(finalPath)).size,
      mimetype: inferredMime,
    };

    const metadata = await this.parseMetadata(finalPath);
    const group = await this.getGroupOrDefault(groupId ?? metadata?.groupId);
    const payload = this.buildTrackPayload({
      file: updatedFile,
      metadata: {
        ...metadata,
        compression: compressionMeta,
        groupId: group.id,
      },
      baseUrl,
    });

    const transaction = this.db.transaction(() => {
      const fileRow = this.createFileRecord({ file: updatedFile, baseUrl });
      const trackRow = this.model.create({
        ...payload,
        fileId: fileRow.id,
        fileUrl: fileRow.file_url || payload.fileUrl,
      });
      return { fileRow, trackRow };
    });

    return transaction();
  }

  updateTrack(id, data) {
    const track = this.get(id); // ensure exists
    let payload = { ...data };
    if (Object.prototype.hasOwnProperty.call(data, 'groupId')) {
      const group = this.getGroupOrDefault(data.groupId);
      payload = { ...payload, groupId: group.id };
    }
    return this.model.update(track.id, payload);
  }

  async deleteTrack(id) {
    const track = this.get(id);
    if (track.file_id) {
      await this.fileService.remove(track.file_id);
    } else {
      this.model.delete(id);
      const abs = ensureAbsolutePath(track.file_path);
      if (abs) {
        try {
          await fs.unlink(abs);
        } catch (err) {
          if (err?.code !== 'ENOENT') {
            console.warn('删除音乐文件失败（已忽略）:', err?.message || err);
          }
        }
      }
    }
    return true;
  }
}

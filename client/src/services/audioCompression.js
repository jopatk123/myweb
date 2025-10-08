import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const MIN_BYTES_FOR_COMPRESSION = 8 * 1024 * 1024; // 8MB
const TARGET_BITRATE = 128; // kbps
const STRATEGY_ID = 'browser-ffmpeg-opus-128k';

let ffmpegInstance = null;
let ffmpegLoadingPromise = null;

const isBrowser =
  typeof window !== 'undefined' && typeof Worker !== 'undefined';

async function loadFFmpeg() {
  if (!isBrowser) {
    return null;
  }
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance;
  }
  if (ffmpegInstance) return ffmpegInstance;
  if (!ffmpegLoadingPromise) {
    ffmpegLoadingPromise = (async () => {
      try {
        const ffmpeg = new FFmpeg();
        await ffmpeg.load();
        ffmpegInstance = ffmpeg;
        return ffmpegInstance;
      } catch (error) {
        console.warn('加载 FFmpeg 失败，将跳过压缩:', error?.message || error);
        ffmpegInstance = null;
        throw error;
      } finally {
        if (!ffmpegInstance) {
          ffmpegLoadingPromise = null;
        }
      }
    })();
  }
  return ffmpegLoadingPromise;
}

function shouldCompress(file) {
  if (!file) return false;
  if (file.size >= MIN_BYTES_FOR_COMPRESSION) return true;
  const lowerName = file.name?.toLowerCase() || '';
  const type = file.type || '';
  if (lowerName.endsWith('.flac') || lowerName.endsWith('.wav')) return true;
  if (type.includes('flac') || type.includes('wav')) return true;
  return false;
}

async function transcodeToOpus(ffmpeg, file, { onProgress } = {}) {
  const inputName = `input-${Date.now()}-${Math.random().toString(16).slice(2)}.${
    file.name.split('.').pop() || 'mp3'
  }`;
  const outputName = inputName.replace(/\.[^.]+$/, '.opus');
  let progressHandler;
  if (typeof onProgress === 'function') {
    progressHandler = ({ progress }) => {
      const ratio = typeof progress === 'number' ? progress : 0;
      onProgress(Math.max(0, Math.min(1, ratio)));
    };
    ffmpeg.on('progress', progressHandler);
  }

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec([
      '-i',
      inputName,
      '-vn',
      '-c:a',
      'libopus',
      '-b:a',
      `${TARGET_BITRATE}k`,
      '-vbr',
      'on',
      outputName,
    ]);
    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: 'audio/ogg' });
    const nextName = file.name.replace(/\.[^.]+$/, '') || 'compressed';
    return new File([blob], `${nextName}.opus`, {
      type: 'audio/ogg',
      lastModified: Date.now(),
    });
  } finally {
    if (progressHandler) {
      ffmpeg.off('progress', progressHandler);
    }
    try {
      await ffmpeg.deleteFile(inputName);
    } catch (error) {
      if (import.meta.env && import.meta.env.DEV) {
        console.debug('删除输入文件失败', error);
      }
    }
    try {
      await ffmpeg.deleteFile(outputName);
    } catch (error) {
      if (import.meta.env && import.meta.env.DEV) {
        console.debug('删除输出文件失败', error);
      }
    }
  }
}

export async function prepareCompressedFiles(files, callbacks = {}) {
  const sourceFiles = Array.isArray(files) ? files : [files];
  const shouldRun = sourceFiles.some(shouldCompress);
  if (!shouldRun) {
    return { files: sourceFiles, compression: null };
  }

  let ffmpeg;
  try {
    ffmpeg = await loadFFmpeg();
  } catch {
    return { files: sourceFiles, compression: null };
  }

  if (!ffmpeg) {
    return { files: sourceFiles, compression: null };
  }

  const processed = [];
  for (let index = 0; index < sourceFiles.length; index += 1) {
    const file = sourceFiles[index];
    if (!shouldCompress(file)) {
      processed.push({ file, compressed: false });
      continue;
    }
    callbacks.onFileStart?.({ file, index, total: sourceFiles.length });
    try {
      const compressedFile = await transcodeToOpus(ffmpeg, file, {
        onProgress: ratio =>
          callbacks.onProgress?.({
            file,
            index,
            total: sourceFiles.length,
            ratio,
          }),
      });
      processed.push({ file: compressedFile, compressed: true });
    } catch (error) {
      console.warn('压缩失败，使用原始文件继续上传:', error?.message || error);
      processed.push({ file, compressed: false });
    }
    callbacks.onProgress?.({
      file,
      index,
      total: sourceFiles.length,
      ratio: 1,
    });
  }

  const compressionApplied = processed.some(item => item.compressed);
  const outputFiles = processed.map(item => item.file);
  const compression = compressionApplied
    ? {
        strategy: STRATEGY_ID,
        originalBitrate: null,
        transcodeProfile: `opus@${TARGET_BITRATE}k`,
      }
    : null;

  return { files: outputFiles, compression };
}

export function getCompressionStrategyId() {
  return STRATEGY_ID;
}

export { shouldCompress as shouldCompressFile };

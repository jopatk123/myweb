/**
 * 图片压缩工具
 */

// 最大文件大小（5MB）
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 最大分辨率
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

// 质量设置
const QUALITY_STEPS = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];

/**
 * 压缩图片
 * @param {File} file - 原始图片文件
 * @param {number} maxSize - 最大文件大小（字节）
 * @returns {Promise<File>} 压缩后的图片文件
 */
export async function compressImage(file, maxSize = MAX_FILE_SIZE) {
  // 如果文件已经小于最大大小，直接返回
  if (file.size <= maxSize) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 清理临时URL（img.src 会在下面设置，onload 在运行时可访问 url）
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // ignore
      }

      // 计算新的尺寸
      let { width, height } = calculateDimensions(img.width, img.height);

      // 设置canvas尺寸
      canvas.width = width;
      canvas.height = height;

      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height);

      // 尝试不同的质量设置
      let compressedFile = null;
      let currentQuality = 0.9;

      const tryCompress = () => {
        canvas.toBlob(
          blob => {
            if (!blob) {
              reject(new Error('图片压缩失败'));
              return;
            }

            const compressedSize = blob.size;

            // 如果压缩后的大小仍然超过限制，尝试降低质量
            if (compressedSize > maxSize && currentQuality > 0.1) {
              currentQuality -= 0.1;
              tryCompress();
              return;
            }

            // 如果质量已经降到最低但仍然超过限制，尝试进一步缩小尺寸
            if (compressedSize > maxSize && currentQuality <= 0.1) {
              width = Math.floor(width * 0.8);
              height = Math.floor(height * 0.8);
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
              currentQuality = 0.9;
              tryCompress();
              return;
            }

            // 创建新的文件对象
            compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          file.type,
          currentQuality
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    // 创建文件URL 并设置到 img 上（onload 中负责清理）
    const url = URL.createObjectURL(file);
    img.src = url;
  });
}

/**
 * 计算压缩后的尺寸
 * @param {number} originalWidth - 原始宽度
 * @param {number} originalHeight - 原始高度
 * @returns {{width: number, height: number}} 新的尺寸
 */
function calculateDimensions(originalWidth, originalHeight) {
  let width = originalWidth;
  let height = originalHeight;

  // 如果图片超过最大分辨率，按比例缩小
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }

  return { width, height };
}

/**
 * 批量压缩图片
 * @param {File[]} files - 图片文件数组
 * @param {number} maxSize - 最大文件大小（字节）
 * @returns {Promise<File[]>} 压缩后的图片文件数组
 */
export async function compressImages(files, maxSize = MAX_FILE_SIZE) {
  const compressedFiles = [];

  for (const file of files) {
    try {
      const compressedFile = await compressImage(file, maxSize);
      compressedFiles.push(compressedFile);
    } catch (error) {
      console.error('图片压缩失败:', error);
      // 如果压缩失败，使用原文件
      compressedFiles.push(file);
    }
  }

  return compressedFiles;
}

/**
 * 获取文件大小的可读格式
 * @param {number} bytes - 字节数
 * @returns {string} 可读的文件大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

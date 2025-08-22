// 负责通用的图片读取、尺寸校验与压缩处理
// 返回供上传与预览使用的结构

export const compressImage = (img, maxWidth, maxHeight, quality = 0.8) => {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let { width, height } = img;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      blob => {
        resolve({ blob, width, height });
      },
      'image/jpeg',
      quality
    );
  });
};

export const blobToFile = (blob, fileName) => {
  return new File([blob], fileName, {
    type: blob.type,
    lastModified: Date.now(),
  });
};

export const formatFileSize = bytes => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 处理图片文件：读取、分辨率校验、按需压缩、大小校验
 * @param {File} file 原始文件
 * @param {Object} options 约束
 * @param {number} options.minWidth 最小宽度
 * @param {number} options.minHeight 最小高度
 * @param {number} options.maxWidth 最大宽度
 * @param {number} options.maxHeight 最大高度
 * @param {number} options.maxSizeMB 最大大小（MB）
 * @returns {Promise<{file: File, originalFile: File, name: string, size: number, originalSize: number, width: number, height: number, originalWidth: number, originalHeight: number, wasCompressed: boolean, preview: string}>}
 */
export const processImageFile = async (file, options = {}) => {
  const {
    minWidth = 800,
    minHeight = 600,
    maxWidth = 7680,
    maxHeight = 4320,
    maxSizeMB = 10,
  } = options;

  if (!file || !file.type || !file.type.startsWith('image/')) {
    throw new Error('只支持图片文件');
  }

  const img = new Image();
  const imageLoadPromise = new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const reader = new FileReader();
  const fileReadPromise = new Promise(resolve => {
    reader.onload = e => {
      img.src = e.target.result;
      resolve(e.target.result);
    };
  });

  reader.readAsDataURL(file);
  const preview = await fileReadPromise;
  await imageLoadPromise;

  if (img.width < minWidth || img.height < minHeight) {
    throw new Error(`图片分辨率过低，最小支持 ${minWidth}x${minHeight}`);
  }

  let processedFile = file;
  let finalWidth = img.width;
  let finalHeight = img.height;
  let wasCompressed = false;

  if (img.width > maxWidth || img.height > maxHeight) {
    const compressed = await compressImage(img, maxWidth, maxHeight);
    processedFile = blobToFile(compressed.blob, file.name);
    finalWidth = compressed.width;
    finalHeight = compressed.height;
    wasCompressed = true;
  }

  if (processedFile.size > maxSizeMB * 1024 * 1024) {
    if (wasCompressed) {
      const recompressed = await compressImage(img, maxWidth, maxHeight, 0.6);
      processedFile = blobToFile(recompressed.blob, file.name);
      if (processedFile.size > maxSizeMB * 1024 * 1024) {
        throw new Error(`图片压缩后仍超过${maxSizeMB}MB，请选择更小的图片`);
      }
    } else {
      throw new Error(`文件大小超过${maxSizeMB}MB，请选择更小的图片`);
    }
  }

  return {
    file: processedFile,
    originalFile: file,
    name: file.name,
    size: processedFile.size,
    originalSize: file.size,
    width: finalWidth,
    height: finalHeight,
    originalWidth: img.width,
    originalHeight: img.height,
    wasCompressed,
    preview,
  };
};

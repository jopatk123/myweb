<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>上传壁纸</h3>
        <button @click="$emit('close')" class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="handleUpload">
          <!-- 分组选择 -->
          <div class="form-group">
            <label>选择分组：</label>
            <select v-model="selectedGroupId">
              <option value="">默认分组</option>
              <option v-for="group in groups" :key="group.id" :value="group.id">
                {{ group.name }}
              </option>
            </select>
          </div>

          <!-- 名称输入 -->
          <div class="form-group">
            <label for="wallpaper-name">名称：</label>
            <input type="text" id="wallpaper-name" v-model="wallpaperName" placeholder="请输入壁纸名称" />
          </div>

          <!-- 描述输入 -->
          <div class="form-group">
            <label for="wallpaper-description">描述：</label>
            <textarea id="wallpaper-description" v-model="wallpaperDescription" placeholder="请输入壁纸描述（可选）"></textarea>
          </div>

          <!-- 文件选择 -->
          <div class="form-group">
            <label>选择图片：</label>
            <div class="file-input-wrapper">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                multiple
                @change="handleFileSelect"
                class="file-input"
              />
              <div class="file-input-display" @click="$refs.fileInput.click()">
                <span v-if="selectedFiles.length === 0">
                  点击选择图片文件<br>
                  <small>最小分辨率：800x600，超过7680x4320会自动压缩<br>处理后文件大小不超过10MB</small>
                </span>
                <span v-else>已选择 {{ selectedFiles.length }} 个文件</span>
              </div>
            </div>
          </div>

          <!-- 文件预览 -->
          <div v-if="selectedFiles.length > 0" class="file-preview">
            <div
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="preview-item"
            >
              <img :src="file.preview" :alt="file.name" />
              <div class="preview-info">
                <p class="file-name">{{ file.name }}</p>
                <p class="file-size">
                  {{ formatFileSize(file.size) }}
                  <span v-if="file.wasCompressed" class="compressed-info">
                    (原始: {{ formatFileSize(file.originalSize) }})
                  </span>
                </p>
                <p v-if="file.width && file.height" class="file-resolution">
                  {{ file.width }}x{{ file.height }}
                  <span v-if="file.wasCompressed" class="compressed-info">
                    (原始: {{ file.originalWidth }}x{{ file.originalHeight }})
                  </span>
                </p>
                <p v-if="file.wasCompressed" class="compression-notice">已自动压缩</p>
              </div>
              <button
                type="button"
                @click="removeFile(index)"
                class="remove-btn"
              >
                &times;
              </button>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <!-- 上传进度 -->
          <div v-if="uploading" class="upload-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
            <p>上传中... {{ uploadProgress }}%</p>
          </div>

          <div class="modal-actions">
            <button type="button" @click="$emit('close')" class="btn btn-secondary">
              取消
            </button>
            <button
              type="submit"
              :disabled="selectedFiles.length === 0 || uploading"
              class="btn btn-primary"
            >
              {{ uploading ? '上传中...' : '上传' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useWallpaper } from '@/composables/useWallpaper.js';

const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'uploaded']);

const { uploadWallpaper } = useWallpaper();

const selectedGroupId = ref('');
const wallpaperName = ref('');
const wallpaperDescription = ref('');
const selectedFiles = ref([]);
const uploading = ref(false);
const uploadProgress = ref(0);
const error = ref('');

// 压缩图片函数
const compressImage = (img, maxWidth, maxHeight, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 计算新的尺寸，保持宽高比
    let { width, height } = img;
    
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // 绘制压缩后的图片
    ctx.drawImage(img, 0, 0, width, height);
    
    // 转换为Blob
    canvas.toBlob((blob) => {
      resolve({
        blob,
        width,
        height
      });
    }, 'image/jpeg', quality);
  });
};

// 将Blob转换为File
const blobToFile = (blob, fileName) => {
  return new File([blob], fileName, {
    type: blob.type,
    lastModified: Date.now()
  });
};

// 处理文件选择
const handleFileSelect = async (event) => {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  // 修改为单文件上传逻辑
  const file = files[0];
  selectedFiles.value = [];
  error.value = '';

  // 自动填充名称
  wallpaperName.value = file.name.split('.').slice(0, -1).join('.');

  try {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      error.value = '只支持图片文件';
      return;
    }

    // 创建图片对象
    const img = new Image();
    const imageLoadPromise = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // 读取文件
    const reader = new FileReader();
    const fileReadPromise = new Promise((resolve) => {
      reader.onload = (e) => {
        img.src = e.target.result;
        resolve(e.target.result);
      };
    });
    
    reader.readAsDataURL(file);
    const preview = await fileReadPromise;
    await imageLoadPromise;

    // 检查最小分辨率
    const minWidth = 800;
    const minHeight = 600;
    
    if (img.width < minWidth || img.height < minHeight) {
      error.value = `图片分辨率过低，最小支持 ${minWidth}x${minHeight}`;
      return;
    }

    let processedFile = file;
    let finalWidth = img.width;
    let finalHeight = img.height;
    let wasCompressed = false;

    // 检查是否需要压缩
    const maxWidth = 7680;
    const maxHeight = 4320;
    
    if (img.width > maxWidth || img.height > maxHeight) {
      // 需要压缩
      const compressed = await compressImage(img, maxWidth, maxHeight);
      processedFile = blobToFile(compressed.blob, file.name);
      finalWidth = compressed.width;
      finalHeight = compressed.height;
      wasCompressed = true;
    }

    // 检查处理后的文件大小
    if (processedFile.size > 10 * 1024 * 1024) {
      // 如果还是太大，尝试降低质量
      if (wasCompressed) {
        const recompressed = await compressImage(img, maxWidth, maxHeight, 0.6);
        processedFile = blobToFile(recompressed.blob, file.name);
        
        // 再次检查大小
        if (processedFile.size > 10 * 1024 * 1024) {
          error.value = '图片压缩后仍超过10MB，请选择更小的图片';
          return;
        }
      } else {
        error.value = '文件大小超过10MB，请选择更小的图片';
        return;
      }
    }

    // 添加到选择列表
    selectedFiles.value.push({
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
      preview
    });

  } catch (err) {
    console.error('处理图片时出错:', err);
    error.value = '处理图片时出错，请重试';
  }
};

// 移除文件
const removeFile = (index) => {
  selectedFiles.value.splice(index, 1);
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 处理上传
const handleUpload = async () => {
  if (selectedFiles.value.length === 0) return;

  uploading.value = true;
  uploadProgress.value = 0;
  error.value = '';

  try {
    const fileItem = selectedFiles.value[0];
    await uploadWallpaper(
      fileItem.file,
      selectedGroupId.value || null,
      wallpaperName.value,
      wallpaperDescription.value,
      (progress) => {
        uploadProgress.value = progress;
      }
    );
    emit('uploaded');
  } catch (err) {
    error.value = err.message || '上传失败';
  } finally {
    uploading.value = false;
    uploadProgress.value = 0;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.file-input-wrapper {
  position: relative;
}

.file-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.file-input-display {
  border: 2px dashed #ddd;
  border-radius: 4px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.file-input-display:hover {
  border-color: #007bff;
}

.file-input-display small {
  color: #666;
  font-size: 12px;
  margin-top: 8px;
  display: block;
}

.file-preview {
  margin-top: 20px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 10px;
}

.preview-item img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.preview-info {
  flex: 1;
}

.file-name {
  margin: 0 0 4px 0;
  font-weight: 500;
  color: #333;
}

.file-size {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.file-resolution {
  margin: 0;
  font-size: 12px;
  color: #007bff;
  font-weight: 500;
}

.compressed-info {
  color: #666;
  font-weight: normal;
}

.compression-notice {
  margin: 0;
  font-size: 11px;
  color: #28a745;
  font-weight: 500;
}

.remove-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.remove-btn:hover {
  background: #c82333;
}

.error-message {
  background: #fee;
  color: #c33;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.upload-progress {
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s ease;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}
</style>
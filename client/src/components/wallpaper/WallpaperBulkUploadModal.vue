<template>
  <WallpaperUploadModalShell
    title="批量上传壁纸"
    storage-key="wallpaperBulkUploadPos"
    @close="handleClose"
  >
    <form @submit.prevent="handleUploadAll">
      <div class="form-group">
        <label>选择分组：</label>
        <select v-model="selectedGroupId">
          <option value="">默认分组</option>
          <option v-for="group in groups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>选择图片（支持多选 / 拖拽）：</label>
        <FileDropzone
          class="dropzone"
          accept="image/*"
          :multiple="true"
          @files-selected="handleFiles"
        >
          <span v-if="!hasFiles">
            点击选择或拖拽多个图片文件到此处<br />
            <small
              >最小分辨率：800x600，超过7680x4320会自动压缩；请保证单文件 &lt;=
              10MB</small
            >
          </span>
          <span v-else
            >已选择 <strong>{{ files.length }}</strong> 个文件</span
          >
        </FileDropzone>
      </div>

      <FilePreviewList :items="files" show-progress @remove="removeFile" />

      <div v-if="error" class="error-message">{{ error }}</div>

      <div v-if="uploading" class="upload-progress">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: overallProgress + '%' }"
          ></div>
        </div>
        <p>上传中... {{ overallProgress }}%</p>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" @click="handleClose">
          取消
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!hasFiles || uploading"
        >
          {{ uploading ? '上传中...' : '开始上传' }}
        </button>
      </div>
    </form>
  </WallpaperUploadModalShell>
</template>

<script setup>
  import WallpaperUploadModalShell from '@/components/wallpaper/WallpaperUploadModalShell.vue';
  import { useWallpaperUploader } from '@/composables/useWallpaperUploader.js';
  import FileDropzone from '@/components/wallpaper/upload/FileDropzone.vue';
  import FilePreviewList from '@/components/wallpaper/upload/FilePreviewList.vue';

  defineProps({ groups: { type: Array, default: () => [] } });
  const emit = defineEmits(['close', 'uploaded']);

  const {
    selectedGroupId,
    files,
    uploading,
    error,
    hasFiles,
    overallProgress,
    handleFiles,
    removeFile,
    upload,
    reset,
  } = useWallpaperUploader({ multiple: true });

  const handleUploadAll = async () => {
    if (!hasFiles.value) return;
    try {
      await upload();
      emit('uploaded');
      reset();
    } catch {
      // 错误已在组合函数中处理
    }
  };

  const handleClose = () => {
    reset();
    emit('close');
  };
</script>

<style scoped>
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
    padding: 10px 12px;
    border: 1px solid #e3e7ea;
    border-radius: 6px;
    background: #fff;
    box-shadow: inset 0 1px 0 rgba(0, 0, 0, 0.02);
    font-size: 14px;
  }

  .dropzone {
    display: block;
    border: 2px dashed #d0d7de;
    background: linear-gradient(180deg, #fbfcfd, #ffffff);
    padding: 18px;
    border-radius: 8px;
    text-align: center;
    color: #55606a;
    cursor: pointer;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .dropzone:hover {
    border-color: #9fb0c7;
    box-shadow: 0 6px 18px rgba(16, 24, 40, 0.06);
  }

  .dropzone small {
    display: block;
    color: #6c7a89;
    margin-top: 6px;
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
</style>

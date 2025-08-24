<template>
  <div class="upload-dialog-overlay" @click="$emit('close')">
    <div class="upload-dialog" @click.stop>
      <div class="dialog-header">
        <h3>添加书籍</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="dialog-content">
        <div
          class="upload-area"
          :class="{ 'drag-over': isDragOver }"
          @drop="handleDrop"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @click="triggerFileInput"
        >
          <div class="upload-icon">📁</div>
          <p class="upload-text">
            <strong>点击选择文件</strong> 或拖拽文件到此处
          </p>
          <p class="upload-hint">支持格式: TXT, EPUB, PDF 等</p>

          <input
            ref="fileInput"
            type="file"
            multiple
            accept=".txt,.epub,.pdf"
            @change="handleFileSelect"
            style="display: none"
          />
        </div>

        <div v-if="selectedFiles.length > 0" class="selected-files">
          <h4>已选择的文件:</h4>
          <div class="file-list">
            <div
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="file-item"
            >
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <button class="remove-file" @click="removeFile(index)">✕</button>
            </div>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button
          class="btn btn-primary"
          @click="handleUpload"
          :disabled="selectedFiles.length === 0 || uploading"
        >
          {{ uploading ? '上传中...' : '上传' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue';

  const emit = defineEmits(['upload', 'close']);

  const fileInput = ref(null);
  const selectedFiles = ref([]);
  const isDragOver = ref(false);
  const uploading = ref(false);

  function triggerFileInput() {
    fileInput.value?.click();
  }

  function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addFiles(files);
  }

  function handleDrop(event) {
    event.preventDefault();
    isDragOver.value = false;

    const files = Array.from(event.dataTransfer.files);
    addFiles(files);
  }

  function addFiles(files) {
    const validFiles = files.filter(file => {
      const validExtensions = ['.txt', '.epub', '.pdf'];
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      return validExtensions.includes(extension);
    });

    selectedFiles.value.push(...validFiles);
  }

  function removeFile(index) {
    selectedFiles.value.splice(index, 1);
  }

  async function handleUpload() {
    if (selectedFiles.value.length === 0) return;

    uploading.value = true;
    try {
      emit('upload', selectedFiles.value);
      selectedFiles.value = [];
    } finally {
      uploading.value = false;
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
</script>

<style scoped>
  .upload-dialog-overlay {
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

  .upload-dialog {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
    background: #f8f9fa;
  }

  .dialog-header h3 {
    margin: 0;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: #666;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: #e9ecef;
    color: #333;
  }

  .dialog-content {
    padding: 20px;
    max-height: 400px;
    overflow-y: auto;
  }

  .upload-area {
    border: 2px dashed #ddd;
    border-radius: 8px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #fafafa;
  }

  .upload-area:hover,
  .upload-area.drag-over {
    border-color: #667eea;
    background: #f0f4ff;
  }

  .upload-icon {
    font-size: 3rem;
    margin-bottom: 16px;
  }

  .upload-text {
    margin: 0 0 8px 0;
    color: #333;
    font-size: 1rem;
  }

  .upload-hint {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
  }

  .selected-files {
    margin-top: 20px;
  }

  .selected-files h4 {
    margin: 0 0 12px 0;
    color: #333;
    font-size: 1rem;
  }

  .file-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .file-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;
  }

  .file-name {
    flex: 1;
    font-size: 0.9rem;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-size {
    font-size: 0.8rem;
    color: #666;
    margin: 0 8px;
  }

  .remove-file {
    background: none;
    border: none;
    color: #dc3545;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 0.8rem;
    transition: background 0.2s ease;
  }

  .remove-file:hover {
    background: #f8d7da;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px;
    border-top: 1px solid #eee;
    background: #f8f9fa;
  }

  .btn {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #5a6268;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #5a6fd8;
  }

  @media (max-width: 768px) {
    .upload-dialog {
      width: 95%;
      margin: 20px;
    }

    .dialog-content {
      padding: 16px;
    }

    .upload-area {
      padding: 30px 16px;
    }
  }
</style>

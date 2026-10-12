<template>
  <div class="page-header-wrap">
    <div class="page-header">
      <h1>壁纸管理</h1>
      <div class="action-buttons">
        <button
          @click="$emit('bulk-delete')"
          class="btn btn-danger"
          :disabled="selectedCount === 0"
        >
          删除 ({{ selectedCount }})
        </button>
        <button
          @click="$emit('bulk-move')"
          class="btn btn-secondary"
          :disabled="selectedCount === 0"
        >
          移动 ({{ selectedCount }})
        </button>
        <div class="upload-group">
          <button
            @click="$emit('open-bulk-upload')"
            class="btn btn-primary small"
          >
            上传壁纸
          </button>
          <button
            @click="requestDownload"
            class="btn btn-success small"
            :class="{ 'is-downloading': downloading }"
            :disabled="selectedCount === 0 || downloading"
            :aria-busy="downloading ? 'true' : 'false'"
            :title="downloadTitle"
          >
            <span
              v-if="downloading"
              class="btn-spinner"
              aria-hidden="true"
            ></span>
            {{ downloadLabel }}
          </button>
        </div>
        <button @click="$emit('open-main-window')" class="btn btn-info">
          打开桌面
        </button>
      </div>
    </div>
    <p
      v-if="downloading"
      class="download-status"
      role="status"
      aria-live="polite"
    >
      <span class="download-spinner" aria-hidden="true"></span>
      {{ downloadStatus || '正在准备下载，请稍候…' }}
    </p>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    selectedCount: {
      type: Number,
      default: 0,
    },
    downloading: {
      type: Boolean,
      default: false,
    },
    downloadStatus: {
      type: String,
      default: '',
    },
  });

  const downloadLabel = computed(() => {
    if (props.downloading) {
      return props.selectedCount > 1 ? '正在打包…' : '正在下载…';
    }
    return `下载壁纸 (${props.selectedCount})`;
  });

  const downloadTitle = computed(() => {
    if (props.downloading) return '正在准备文件，请稍候，不要重复点击';
    if (props.selectedCount === 0) return '请先选择要下载的壁纸';
    return `下载选中的 ${props.selectedCount} 张壁纸`;
  });

  const emit = defineEmits([
    'open-main-window',
    'upload-wallpaper',
    'open-bulk-upload',
    'bulk-delete',
    'bulk-move',
    'download-wallpapers',
  ]);

  const requestDownload = () => {
    if (props.downloading || props.selectedCount === 0) return;
    emit('download-wallpapers');
  };
</script>

<style scoped>
  .page-header-wrap {
    margin-bottom: 12px;
  }
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .page-header h1 {
    margin: 0;
    color: #111827;
    font-size: 20px;
  }
  .action-buttons {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .upload-group {
    display: flex;
    gap: 6px;
  }
  .upload-group .small {
    padding: 6px 10px;
    font-size: 13px;
  }
  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s ease;
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .btn.is-downloading:disabled {
    opacity: 1;
    cursor: wait;
  }
  .btn-spinner,
  .download-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: download-spin 0.8s linear infinite;
    flex: 0 0 auto;
  }
  .btn-spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    margin-right: 6px;
    vertical-align: -2px;
  }
  .download-status {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 10px 0 0;
    padding: 8px 12px;
    border-radius: 6px;
    background: #ecfdf3;
    color: #166534;
    font-size: 13px;
    line-height: 1.4;
  }
  @keyframes download-spin {
    to {
      transform: rotate(360deg);
    }
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
  .btn-secondary:hover:not(:disabled) {
    background: #545b62;
  }
  .btn-accent {
    background: #28a745;
    color: white;
  }
  .btn-accent:hover:not(:disabled) {
    background: #1e7e34;
  }
  .btn-danger {
    background: #dc3545;
    color: white;
  }
  .btn-danger:hover:not(:disabled) {
    background: #c82333;
  }
  .btn-success {
    background: #28a745;
    color: white;
  }
  .btn-success:hover:not(:disabled) {
    background: #218838;
  }
  .btn-info {
    background: #17a2b8;
    color: white;
  }
  .btn-info:hover:not(:disabled) {
    background: #138496;
  }
</style>

<template>
  <div v-if="shouldShow" class="upload-progress-panel">
    <div class="panel-header">
      <div class="title">文件上传中</div>
      <button class="close-btn" @click="onClose" title="关闭">×</button>
    </div>

    <div class="progress-container">
      <div class="file-info">
        <div class="file-name">{{ currentFileName }}</div>
        <div class="file-size">
          {{ formatFileSize(uploadedBytes) }} / {{ formatFileSize(totalBytes) }}
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>

      <div class="progress-details">
        <span class="progress-text">{{ progress }}%</span>
        <span class="speed-text" v-if="uploadSpeed > 0">{{
          formatSpeed(uploadSpeed)
        }}</span>
      </div>
    </div>

    <div class="upload-list" v-if="uploadQueue.length > 1">
      <div class="list-title">上传队列 ({{ uploadQueue.length }} 个文件)</div>
      <div class="queue-item" v-for="(item, index) in uploadQueue" :key="index">
        <div class="item-name">{{ item.name }}</div>
        <div class="item-progress">
          <div class="item-bar">
            <div
              class="item-fill"
              :style="{ width: item.progress + '%' }"
            ></div>
          </div>
          <span class="item-text">{{ item.progress }}%</span>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="upload-hidden"></div>
</template>

<script setup>
  import { computed, ref, watch } from 'vue';

  const props = defineProps({
    progress: { type: Number, default: 0 },
    uploading: { type: Boolean, default: false },
    uploadedBytes: { type: Number, default: 0 },
    totalBytes: { type: Number, default: 0 },
    currentFileName: { type: String, default: '' },
    uploadQueue: { type: Array, default: () => [] },
  });

  const emit = defineEmits(['close']);

  const uploadSpeed = ref(0);
  const lastUploadedBytes = ref(0);
  const lastTime = ref(0);

  const visible = computed(
    () => props.uploading && props.progress > 0 && props.progress < 100
  );

  // 添加一个本地状态来控制面板显示
  const panelVisible = ref(true);

  // 监听上传状态变化，重置面板显示状态
  watch(
    () => props.uploading,
    uploading => {
      if (uploading) {
        panelVisible.value = true;
      }
    }
  );

  // 计算最终显示状态
  const shouldShow = computed(() => {
    return visible.value && panelVisible.value;
  });

  // 计算上传速度
  watch(
    () => props.uploadedBytes,
    (newBytes, oldBytes) => {
      const now = Date.now();
      if (lastTime.value > 0 && newBytes > oldBytes) {
        const timeDiff = (now - lastTime.value) / 1000; // 秒
        const bytesDiff = newBytes - oldBytes;
        uploadSpeed.value = bytesDiff / timeDiff; // 字节/秒
      }
      lastUploadedBytes.value = newBytes;
      lastTime.value = now;
    }
  );

  // 重置速度计算
  watch(
    () => props.uploading,
    uploading => {
      if (!uploading) {
        uploadSpeed.value = 0;
        lastUploadedBytes.value = 0;
        lastTime.value = 0;
      }
    }
  );

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatSpeed(bytesPerSecond) {
    if (bytesPerSecond === 0) return '';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return (
      parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    );
  }

  function onClose() {
    panelVisible.value = false;
    emit('close');
  }
</script>

<style scoped>
  .upload-progress-panel {
    position: fixed;
    left: 16px;
    bottom: 16px;
    width: 320px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border-radius: 12px;
    overflow: hidden;
    z-index: 1000;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .title {
    font-size: 14px;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .progress-container {
    padding: 16px;
  }

  .file-info {
    margin-bottom: 12px;
  }

  .file-name {
    font-size: 13px;
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    font-size: 11px;
    color: #666;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background: #f0f0f0;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4ade80, #22c55e);
    transition: width 0.3s ease;
    border-radius: 3px;
  }

  .progress-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-text {
    font-size: 12px;
    font-weight: 600;
    color: #333;
  }

  .speed-text {
    font-size: 11px;
    color: #666;
  }

  .upload-list {
    border-top: 1px solid #f0f0f0;
    padding: 12px 16px;
    background: #fafafa;
  }

  .list-title {
    font-size: 11px;
    color: #666;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .queue-item {
    margin-bottom: 8px;
  }

  .queue-item:last-child {
    margin-bottom: 0;
  }

  .item-name {
    font-size: 11px;
    color: #333;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .item-bar {
    flex: 1;
    height: 3px;
    background: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
  }

  .item-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
    transition: width 0.2s ease;
    border-radius: 2px;
  }

  .item-text {
    font-size: 10px;
    color: #666;
    min-width: 30px;
    text-align: right;
  }

  .upload-hidden {
    display: none;
  }
</style>

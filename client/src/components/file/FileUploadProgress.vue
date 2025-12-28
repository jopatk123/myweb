<template>
  <Transition name="slide-up">
    <div
      v-if="shouldShow"
      class="upload-progress-panel"
      data-testid="upload-progress-panel"
    >
      <div class="panel-header">
        <div class="header-left">
          <div class="title">{{ headerTitle }}</div>
          <div class="subtitle" v-if="uploadQueue.length > 1">
            {{ completedCount }}/{{ uploadQueue.length }} 个文件
          </div>
        </div>
        <div class="header-actions">
          <button
            v-if="!isComplete"
            class="minimize-btn"
            @click="onMinimize"
            :title="minimized ? '展开' : '最小化'"
          >
            {{ minimized ? '▲' : '▼' }}
          </button>
          <button class="close-btn" @click="onClose" title="关闭">×</button>
        </div>
      </div>

      <Transition name="collapse">
        <div v-if="!minimized" class="progress-container">
          <div class="file-info">
            <div class="file-name" :title="currentFileName">
              <span class="file-icon">{{ getFileEmoji(currentFileName) }}</span>
              {{ truncateFileName(currentFileName, 30) }}
            </div>
            <div class="file-size">
              {{ formatFileSize(uploadedBytes) }} /
              {{ formatFileSize(totalBytes) }}
            </div>
          </div>

          <div
            class="progress-bar"
            :class="{ complete: isComplete, error: hasError }"
          >
            <div
              class="progress-fill"
              :style="{ width: progress + '%' }"
              :class="{ 'animate-pulse': progress > 0 && progress < 100 }"
            ></div>
          </div>

          <div class="progress-details">
            <span class="progress-text" :class="{ complete: isComplete }">
              {{ isComplete ? '✓ 完成' : progress + '%' }}
            </span>
            <div class="speed-info">
              <span class="speed-text" v-if="uploadSpeed > 0 && !isComplete">
                {{ formatSpeed(uploadSpeed) }}
              </span>
              <span class="time-remaining" v-if="remainingTime && !isComplete">
                剩余 {{ formatRemainingTime(remainingTime) }}
              </span>
            </div>
          </div>

          <div class="upload-list" v-if="uploadQueue.length > 1">
            <div class="list-header">
              <span class="list-title">上传队列</span>
              <span class="list-count"
                >{{ completedCount }}/{{ uploadQueue.length }}</span
              >
            </div>
            <div
              class="queue-scroll"
              :class="{ 'show-scroll': uploadQueue.length > 3 }"
            >
              <div
                class="queue-item"
                v-for="(item, index) in uploadQueue"
                :key="index"
                :class="{
                  current: index === currentIndex,
                  completed: item.progress === 100,
                  waiting: item.progress === 0 && index !== currentIndex,
                }"
              >
                <span class="item-status">
                  {{
                    item.progress === 100
                      ? '✓'
                      : index === currentIndex
                        ? '⬆'
                        : '○'
                  }}
                </span>
                <div class="item-name" :title="item.name">
                  {{ truncateFileName(item.name, 20) }}
                </div>
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
        </div>
      </Transition>
    </div>
  </Transition>
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
    error: { type: String, default: '' },
  });

  const emit = defineEmits(['close']);

  const uploadSpeed = ref(0);
  const lastUploadedBytes = ref(0);
  const lastTime = ref(0);
  const minimized = ref(false);
  const speedSamples = ref([]);
  const MAX_SAMPLES = 5;

  const visible = computed(
    () => props.uploading && props.progress > 0 && props.progress < 100
  );

  const isComplete = computed(() => props.progress === 100 && !props.uploading);
  const hasError = computed(() => !!props.error);

  const completedCount = computed(
    () => props.uploadQueue.filter(item => item.progress === 100).length
  );

  const currentIndex = computed(() =>
    props.uploadQueue.findIndex(
      item => item.progress > 0 && item.progress < 100
    )
  );

  const headerTitle = computed(() => {
    if (isComplete.value) return '上传完成';
    if (hasError.value) return '上传失败';
    return '文件上传中';
  });

  // 添加一个本地状态来控制面板显示
  const panelVisible = ref(true);

  // 监听上传状态变化，重置面板显示状态
  watch(
    () => props.uploading,
    uploading => {
      if (uploading) {
        panelVisible.value = true;
        minimized.value = false;
        speedSamples.value = [];
      }
    }
  );

  // 计算最终显示状态 - 上传完成后保持显示2秒
  const shouldShow = computed(() => {
    return (visible.value || isComplete.value) && panelVisible.value;
  });

  // 计算平滑的上传速度（使用滑动平均）
  watch(
    () => props.uploadedBytes,
    (newBytes, oldBytes) => {
      const now = Date.now();
      if (lastTime.value > 0 && newBytes > oldBytes) {
        const timeDiff = (now - lastTime.value) / 1000;
        if (timeDiff > 0) {
          const bytesDiff = newBytes - oldBytes;
          const instantSpeed = bytesDiff / timeDiff;

          // 添加到采样数组
          speedSamples.value.push(instantSpeed);
          if (speedSamples.value.length > MAX_SAMPLES) {
            speedSamples.value.shift();
          }

          // 计算平均速度
          const avgSpeed =
            speedSamples.value.reduce((a, b) => a + b, 0) /
            speedSamples.value.length;
          uploadSpeed.value = avgSpeed;
        }
      }
      lastUploadedBytes.value = newBytes;
      lastTime.value = now;
    }
  );

  // 计算剩余时间
  const remainingTime = computed(() => {
    if (uploadSpeed.value <= 0 || props.uploadedBytes >= props.totalBytes)
      return 0;
    const remainingBytes = props.totalBytes - props.uploadedBytes;
    return remainingBytes / uploadSpeed.value;
  });

  // 重置速度计算
  watch(
    () => props.uploading,
    uploading => {
      if (!uploading) {
        uploadSpeed.value = 0;
        lastUploadedBytes.value = 0;
        lastTime.value = 0;
        speedSamples.value = [];
      }
    }
  );

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    if (!bytes || bytes < 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatSpeed(bytesPerSecond) {
    if (bytesPerSecond === 0 || !isFinite(bytesPerSecond)) return '';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return (
      parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    );
  }

  function formatRemainingTime(seconds) {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return '';

    if (seconds < 60) {
      return `${Math.ceil(seconds)}秒`;
    }

    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.ceil(seconds % 60);
      return secs > 0 ? `${mins}分${secs}秒` : `${mins}分`;
    }

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}时${mins}分` : `${hours}时`;
  }

  function truncateFileName(name, maxLength) {
    if (!name || name.length <= maxLength) return name || '';
    const ext =
      name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : '';
    const baseName = name.slice(0, name.length - ext.length);
    const truncateLength = maxLength - ext.length - 3;
    if (truncateLength <= 0) return name.slice(0, maxLength - 3) + '...';
    return baseName.slice(0, truncateLength) + '...' + ext;
  }

  function getFileEmoji(fileName) {
    if (!fileName) return '📄';
    const ext = fileName.toLowerCase().split('.').pop();
    const emojiMap = {
      // 图片
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      webp: '🖼️',
      svg: '🖼️',
      bmp: '🖼️',
      // 视频
      mp4: '🎬',
      mov: '🎬',
      avi: '🎬',
      mkv: '🎬',
      webm: '🎬',
      flv: '🎬',
      // 音频
      mp3: '🎵',
      wav: '🎵',
      flac: '🎵',
      aac: '🎵',
      ogg: '🎵',
      m4a: '🎵',
      // 文档
      doc: '📝',
      docx: '📝',
      odt: '📝',
      xls: '📊',
      xlsx: '📊',
      csv: '📊',
      ods: '📊',
      ppt: '📽️',
      pptx: '📽️',
      odp: '📽️',
      pdf: '📕',
      txt: '📃',
      md: '📃',
      rtf: '📃',
      // 代码
      js: '💻',
      ts: '💻',
      vue: '💻',
      jsx: '💻',
      tsx: '💻',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      py: '🐍',
      java: '☕',
      c: '⚙️',
      cpp: '⚙️',
      go: '🐹',
      rs: '🦀',
      json: '📋',
      xml: '📋',
      yaml: '📋',
      yml: '📋',
      // 压缩
      zip: '📦',
      rar: '📦',
      '7z': '📦',
      tar: '📦',
      gz: '📦',
      // 电子书
      epub: '📚',
      mobi: '📚',
      azw3: '📚',
    };
    return emojiMap[ext] || '📄';
  }

  function onMinimize() {
    minimized.value = !minimized.value;
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
    width: 340px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border-radius: 12px;
    overflow: hidden;
    z-index: 1000;
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
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

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .title {
    font-size: 14px;
    font-weight: 600;
  }

  .subtitle {
    font-size: 11px;
    opacity: 0.85;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .minimize-btn,
  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 14px;
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

  .minimize-btn:hover,
  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .close-btn {
    font-size: 18px;
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
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .file-icon {
    font-size: 16px;
    flex-shrink: 0;
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

  .progress-bar.complete {
    background: #d1fae5;
  }

  .progress-bar.error {
    background: #fee2e2;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4ade80, #22c55e);
    transition: width 0.3s ease;
    border-radius: 3px;
  }

  .progress-fill.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
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

  .progress-text.complete {
    color: #22c55e;
  }

  .speed-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .speed-text {
    font-size: 11px;
    color: #666;
  }

  .time-remaining {
    font-size: 11px;
    color: #999;
  }

  .upload-list {
    border-top: 1px solid #f0f0f0;
    padding: 12px 16px;
    background: #fafafa;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .list-title {
    font-size: 11px;
    color: #666;
    font-weight: 500;
  }

  .list-count {
    font-size: 10px;
    color: #999;
  }

  .queue-scroll {
    max-height: 150px;
    overflow-y: auto;
  }

  .queue-scroll.show-scroll {
    padding-right: 4px;
  }

  .queue-scroll::-webkit-scrollbar {
    width: 4px;
  }

  .queue-scroll::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }

  .queue-scroll::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 2px;
  }

  .queue-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    background: white;
    transition: all 0.2s ease;
  }

  .queue-item:last-child {
    margin-bottom: 0;
  }

  .queue-item.current {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
  }

  .queue-item.completed {
    background: #f0fdf4;
  }

  .queue-item.waiting {
    opacity: 0.6;
  }

  .item-status {
    font-size: 12px;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
  }

  .item-name {
    font-size: 11px;
    color: #333;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-progress {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .item-bar {
    width: 50px;
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

  .queue-item.completed .item-fill {
    background: linear-gradient(90deg, #4ade80, #22c55e);
  }

  .item-text {
    font-size: 10px;
    color: #666;
    min-width: 28px;
    text-align: right;
  }

  /* 动画效果 */
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: all 0.3s ease;
  }

  .slide-up-enter-from,
  .slide-up-leave-to {
    opacity: 0;
    transform: translateY(20px);
  }

  .collapse-enter-active,
  .collapse-leave-active {
    transition: all 0.2s ease;
    overflow: hidden;
  }

  .collapse-enter-from,
  .collapse-leave-to {
    opacity: 0;
    max-height: 0;
  }

  .collapse-enter-to,
  .collapse-leave-from {
    max-height: 400px;
  }
</style>

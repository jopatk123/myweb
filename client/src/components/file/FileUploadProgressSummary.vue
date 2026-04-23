<template>
  <div class="file-info">
    <div class="file-name" :title="fileName">
      <span class="file-icon">{{ fileEmoji }}</span>
      {{ displayFileName }}
    </div>
    <div class="file-size">
      {{ formatFileSize(uploadedBytes) }} /
      {{ formatFileSize(totalBytes) }}
    </div>
  </div>

  <div class="progress-bar" :class="{ complete: complete, error: hasError }">
    <div
      class="progress-fill"
      :style="{ width: progress + '%' }"
      :class="{ 'animate-pulse': progress > 0 && progress < 100 }"
    ></div>
  </div>

  <div class="progress-details">
    <span class="progress-text" :class="{ complete }">
      {{ complete ? '✓ 完成' : progress + '%' }}
    </span>
    <div class="speed-info">
      <span class="speed-text" v-if="showSpeed">
        {{ formatSpeed(uploadSpeed) }}
      </span>
      <span class="time-remaining" v-if="showRemainingTime">
        剩余 {{ formatRemainingTime(remainingTime) }}
      </span>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';
  import { formatFileSize } from '@/utils/fileSize.js';
  import {
    formatUploadSpeed as formatSpeed,
    formatRemainingTime,
  } from '@/utils/fileProgress.js';
  import { getFileEmoji, truncateFileName } from '@/utils/fileName.js';

  const props = defineProps({
    fileName: { type: String, default: '' },
    uploadedBytes: { type: Number, default: 0 },
    totalBytes: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    uploadSpeed: { type: Number, default: 0 },
    remainingTime: { type: Number, default: 0 },
    complete: { type: Boolean, default: false },
    hasError: { type: Boolean, default: false },
    nameLength: { type: Number, default: 30 },
  });

  const displayFileName = computed(() =>
    truncateFileName(props.fileName, props.nameLength)
  );
  const fileEmoji = computed(() => getFileEmoji(props.fileName));
  const showSpeed = computed(() => props.uploadSpeed > 0 && !props.complete);
  const showRemainingTime = computed(
    () => props.remainingTime && !props.complete
  );
</script>

<style scoped>
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
</style>

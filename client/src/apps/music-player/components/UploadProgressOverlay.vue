<template>
  <transition name="fade">
    <div v-if="state.uploading" class="upload-progress">
      <div class="progress-card">
        <p>正在上传：{{ state.filename }}</p>
        <div class="progress-bar">
          <div
            class="progress-inner"
            :style="{ width: `${state.progress}%` }"
          ></div>
        </div>
        <p class="progress-meta">
          {{ state.progress }}% ({{ formatBytes(state.loaded) }} /
          {{ formatBytes(state.total) }})
        </p>
      </div>
    </div>
  </transition>
</template>

<script setup>
  import { computed } from 'vue';
  import { formatBytes as baseFormatBytes } from '../utils/formatters.js';

  const props = defineProps({
    uploadingState: {
      type: Object,
      required: true,
    },
    formatBytes: {
      type: Function,
      default: baseFormatBytes,
    },
  });

  const state = computed(() => props.uploadingState ?? {});

  function formatBytes(value) {
    return props.formatBytes(value);
  }
</script>

<style scoped>
  .upload-progress {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(18, 16, 27, 0.7);
    backdrop-filter: blur(6px);
  }

  .progress-card {
    background: rgba(33, 30, 44, 0.9);
    border-radius: 16px;
    padding: 18px 24px;
    color: #fff;
    min-width: 280px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-inner {
    height: 100%;
    background: linear-gradient(135deg, #ff8a65, #ffcc80);
    transition: width 0.2s ease;
  }

  .progress-meta {
    font-size: 13px;
    opacity: 0.75;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>

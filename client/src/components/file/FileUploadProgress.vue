<template>
  <Transition name="slide-up">
    <div
      v-if="shouldShow"
      class="upload-progress-panel"
      data-testid="upload-progress-panel"
    >
      <FileUploadPanelHeader
        :title="headerTitle"
        :subtitle="queueSubtitle"
        :minimized="minimized"
        :show-minimize="!isComplete"
        @minimize="onMinimize"
        @close="onClose"
      />

      <Transition name="collapse">
        <div v-if="!minimized" class="progress-container">
          <FileUploadProgressSummary
            :file-name="currentFileName"
            :uploaded-bytes="uploadedBytes"
            :total-bytes="totalBytes"
            :progress="progress"
            :upload-speed="uploadSpeed"
            :remaining-time="remainingTime"
            :complete="isComplete"
            :has-error="hasError"
          />

          <FileUploadQueueList
            :upload-queue="uploadQueue"
            :current-index="currentIndex"
            :completed-count="completedCount"
          />
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
  import { computed, ref, watch } from 'vue';
  import FileUploadPanelHeader from './FileUploadPanelHeader.vue';
  import FileUploadProgressSummary from './FileUploadProgressSummary.vue';
  import FileUploadQueueList from './FileUploadQueueList.vue';

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
  const lastTime = ref(0);
  const minimized = ref(false);
  const speedSamples = ref([]);
  const panelVisible = ref(true);
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

  const queueSubtitle = computed(() => {
    if (props.uploadQueue.length <= 1) return '';
    return `${completedCount.value}/${props.uploadQueue.length} 个文件`;
  });

  const shouldShow = computed(() => {
    return (visible.value || isComplete.value) && panelVisible.value;
  });

  watch(
    () => props.uploading,
    uploading => {
      if (uploading) {
        panelVisible.value = true;
        minimized.value = false;
      }

      uploadSpeed.value = 0;
      lastTime.value = 0;
      speedSamples.value = [];
    }
  );

  watch(
    () => props.uploadedBytes,
    (newBytes, oldBytes) => {
      const now = Date.now();
      if (
        lastTime.value > 0 &&
        typeof oldBytes === 'number' &&
        newBytes > oldBytes
      ) {
        const timeDiff = (now - lastTime.value) / 1000;
        if (timeDiff > 0) {
          const bytesDiff = newBytes - oldBytes;
          const instantSpeed = bytesDiff / timeDiff;

          speedSamples.value.push(instantSpeed);
          if (speedSamples.value.length > MAX_SAMPLES) {
            speedSamples.value.shift();
          }

          const avgSpeed =
            speedSamples.value.reduce((a, b) => a + b, 0) /
            speedSamples.value.length;
          uploadSpeed.value = avgSpeed;
        }
      }
      lastTime.value = now;
    }
  );

  const remainingTime = computed(() => {
    if (uploadSpeed.value <= 0 || props.uploadedBytes >= props.totalBytes) {
      return 0;
    }
    const remainingBytes = props.totalBytes - props.uploadedBytes;
    return remainingBytes / uploadSpeed.value;
  });

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

  .progress-container {
    padding: 16px;
  }

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

<template>
  <div v-if="visible" class="upload-progress">
    <div class="bar" :style="{ width: progress + '%' }"></div>
    <div class="text">{{ progress }}%</div>
  </div>
  <div v-else class="upload-hidden"></div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    progress: { type: Number, default: 0 },
    uploading: { type: Boolean, default: false },
  });

  const visible = computed(
    () => props.uploading && props.progress > 0 && props.progress < 100
  );
</script>

<style scoped>
  .upload-progress {
    position: fixed;
    left: 16px;
    bottom: 16px;
    width: 260px;
    height: 10px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    border-radius: 999px;
    overflow: hidden;
    z-index: 4;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
  .bar {
    height: 100%;
    background: linear-gradient(90deg, #4ade80, #22c55e);
    transition: width 0.2s ease;
  }
  .text {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 22px;
    text-align: left;
    font-size: 12px;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }
</style>

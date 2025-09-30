<template>
  <div class="progress-bar">
    <div class="progress-fill" :style="{ width: clampedPercentage + '%' }" />
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    percentage: {
      type: Number,
      default: 0,
    },
  });

  const clampedPercentage = computed(() => {
    if (Number.isNaN(props.percentage)) return 0;
    return Math.min(Math.max(props.percentage, 0), 100);
  });
</script>

<style scoped>
  .progress-bar {
    height: 3px;
    background: rgba(0, 0, 0, 0.1);
    position: relative;
    flex-shrink: 0;
  }

  .progress-fill {
    height: 100%;
    background: #667eea;
    transition: width 0.3s ease;
  }
</style>

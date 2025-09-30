<template>
  <div class="font-size-controls">
    <button
      class="size-btn"
      type="button"
      @click="decrease"
      :disabled="modelValue <= min"
    >
      A-
    </button>
    <span class="size-display">{{ modelValue }}px</span>
    <button
      class="size-btn"
      type="button"
      @click="increase"
      :disabled="modelValue >= max"
    >
      A+
    </button>
  </div>
</template>

<script setup>
  import { computed } from 'vue';
  import { FONT_SIZE_RANGE } from '../../constants/settings.js';

  const props = defineProps({
    modelValue: {
      type: Number,
      required: true,
    },
    min: {
      type: Number,
      default: FONT_SIZE_RANGE.min,
    },
    max: {
      type: Number,
      default: FONT_SIZE_RANGE.max,
    },
    step: {
      type: Number,
      default: FONT_SIZE_RANGE.step,
    },
  });

  const emit = defineEmits(['update:modelValue']);

  const step = computed(() => Math.max(props.step, 1));

  function update(value) {
    const clamped = Math.min(Math.max(value, props.min), props.max);
    emit('update:modelValue', clamped);
  }

  function increase() {
    update(props.modelValue + step.value);
  }

  function decrease() {
    update(props.modelValue - step.value);
  }
</script>

<style scoped>
  .font-size-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .size-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .size-btn:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #667eea;
  }

  .size-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .size-display {
    font-size: 0.9rem;
    color: #666;
    min-width: 50px;
    text-align: center;
  }
</style>

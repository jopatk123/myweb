<template>
  <div class="range-slider">
    <input
      class="slider"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="onInput"
      :aria-label="ariaLabel"
    />
    <span class="value-display">{{ formattedValue }}</span>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    modelValue: {
      type: Number,
      required: true,
    },
    min: {
      type: Number,
      required: true,
    },
    max: {
      type: Number,
      required: true,
    },
    step: {
      type: Number,
      default: 1,
    },
    unit: {
      type: String,
      default: '',
    },
    precision: {
      type: Number,
      default: 1,
    },
    ariaLabel: {
      type: String,
      default: '',
    },
  });

  const emit = defineEmits(['update:modelValue']);

  const formattedValue = computed(() => {
    const value = Number(props.modelValue);
    if (Number.isNaN(value)) return `0${props.unit}`;
    return `${value.toFixed(props.precision).replace(/\.0+$/, '')}${props.unit}`;
  });

  function onInput(event) {
    const value = Number.parseFloat(event.target.value);
    emit('update:modelValue', Number.isNaN(value) ? props.min : value);
  }
</script>

<style scoped>
  .range-slider {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
  }

  .slider {
    width: 120px;
    height: 4px;
    border-radius: 2px;
    background: #ddd;
    outline: none;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
  }

  .value-display {
    font-size: 0.9rem;
    color: #666;
    min-width: 50px;
    text-align: center;
  }
</style>

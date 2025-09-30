<template>
  <div class="theme-options">
    <button
      v-for="theme in options"
      :key="theme.value"
      type="button"
      class="theme-option"
      :class="{ active: theme.value === modelValue }"
      @click="() => emit('update:modelValue', theme.value)"
    >
      <span class="theme-preview" :class="`preview-${theme.value}`" />
      <span class="theme-label">{{ theme.label }}</span>
    </button>
  </div>
</template>

<script setup>
  const props = defineProps({
    options: {
      type: Array,
      default: () => [],
    },
    modelValue: {
      type: String,
      required: true,
    },
  });

  void props;

  const emit = defineEmits(['update:modelValue']);
</script>

<style scoped>
  .theme-options {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  .theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: background 0.2s ease;
    background: transparent;
    border: none;
  }

  .theme-option:hover {
    background: #f8f9fa;
  }

  .theme-option.active {
    background: #e3f2fd;
  }

  .theme-preview {
    width: 40px;
    height: 30px;
    border-radius: 6px;
    margin-bottom: 8px;
    border: 2px solid #ddd;
  }

  .preview-light {
    background: white;
  }

  .preview-dark {
    background: #1a1a1a;
  }

  .preview-sepia {
    background: #f4f1e8;
  }

  .theme-option.active .theme-preview {
    border-color: #667eea;
  }

  .theme-label {
    font-size: 0.8rem;
    color: #666;
  }
</style>

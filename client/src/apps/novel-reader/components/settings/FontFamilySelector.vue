<template>
  <div class="font-family-options">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="font-btn"
      :class="{ active: option.value === modelValue }"
      @click="() => emit('update:modelValue', option.value)"
    >
      {{ option.label }}
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
  .font-family-options {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .font-btn {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.85rem;
  }

  .font-btn:hover {
    background: #f8f9fa;
    border-color: #667eea;
  }

  .font-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }
</style>

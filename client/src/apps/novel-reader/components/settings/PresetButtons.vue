<template>
  <div class="preset-options">
    <button
      v-for="preset in presets"
      :key="preset.name"
      type="button"
      class="preset-btn"
      @click="() => emit('apply', preset)"
    >
      {{ preset.name }}
    </button>
  </div>
</template>

<script setup>
  const props = defineProps({
    presets: {
      type: Array,
      default: () => [],
    },
  });

  void props;

  const emit = defineEmits(['apply']);
</script>

<style scoped>
  .preset-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 8px;
  }

  .preset-btn {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .preset-btn:hover {
    background: #f8f9fa;
    border-color: #667eea;
  }
</style>

<template>
  <div class="mode-select-overlay">
    <h2>选择模式</h2>
    <div class="mode-buttons">
      <button @click="$emit('select-ai')">AI模式</button>
      <button @click="$emit('select-multiplayer')">多人模式</button>
    </div>
  </div>
</template>

<script setup>
  defineEmits(['select-ai', 'select-multiplayer']);
</script>

<style scoped>
  .mode-select-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(6px);
    background: rgba(0, 0, 0, 0.4);
    color: #fff;
    gap: 20px;
  }

  .mode-select-overlay .mode-buttons {
    display: flex;
    gap: 20px;
  }

  .mode-select-overlay button {
    padding: 12px 28px;
    font-size: 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: #4a67ff;
    color: #fff;
  }
</style>

<template>
  <div class="error-message">
    ⚠️ {{ error }}
    <button @click="$emit('close')" class="close-btn">&times;</button>
  </div>
</template>

<script setup>
  defineProps({
    error: { type: String, required: true },
  });

  defineEmits(['close']);
</script>

<style scoped>
  .error-message {
    background: #ff4757;
    color: white;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>

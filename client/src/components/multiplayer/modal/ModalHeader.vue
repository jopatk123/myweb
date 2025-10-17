<template>
  <div class="modal-header">
    <h3>{{ title }}</h3>
    <button class="close-btn" @click="$emit('close')">×</button>
  </div>
</template>

<script setup>
  defineProps({
    title: { type: String, required: true },
  });

  defineEmits(['close']);
</script>

<style scoped>
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 25px;
    border-bottom: 1px solid #e1e8ed;
  }

  .modal-header h3 {
    margin: 0;
    color: #2c3e50;
    font-size: 18px;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: #666;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.3s;
  }

  .close-btn:hover {
    background: #f5f5f5;
    color: #ff4757;
  }
</style>

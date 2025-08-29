<template>
  <div class="error-message">
    <span class="error-icon">⚠️</span>
    <span class="error-text">{{ error }}</span>
  </div>
</template>

<script setup>
defineProps({
  error: { type: String, required: true }
})
</script>

<style scoped>
.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  color: #e53e3e;
  font-size: 14px;
  margin-top: 16px;
}

.error-icon {
  font-size: 16px;
}

.error-text {
  flex: 1;
}
</style>

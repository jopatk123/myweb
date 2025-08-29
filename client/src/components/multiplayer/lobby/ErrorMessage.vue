<template>
  <div v-if="error" class="error-message">
    ⚠️ {{ error }}
    <button @click="$emit('clearError')" class="close-btn">&times;</button>
  </div>
</template>

<script setup>
defineProps({
  error: {
    type: String,
    default: null
  }
});

defineEmits(['clearError']);
</script>

<style scoped>
.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  position: relative;
}

.close-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
}
</style>

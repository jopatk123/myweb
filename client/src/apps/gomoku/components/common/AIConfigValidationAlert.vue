<template>
  <div v-if="message" class="validation-error">
    {{ message }}
  </div>
</template>

<script setup>
  defineProps({
    message: {
      type: String,
      default: '',
    },
  });
</script>

<style scoped>
  .validation-error {
    margin-top: 15px;
    padding: 12px;
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    text-align: center;
  }
</style>

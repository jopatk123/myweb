<template>
  <div v-if="visible" class="confirm-dialog-overlay" @click="$emit('cancel')">
    <div class="confirm-dialog" @click.stop>
      <h3>{{ title }}</h3>
      <p v-for="line in normalizedLines" :key="line">{{ line }}</p>
      <div class="confirm-actions">
        <button @click="$emit('cancel')" class="cancel-btn">
          {{ cancelText }}
        </button>
        <button @click="$emit('confirm')" class="confirm-btn">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    visible: { type: Boolean, default: false },
    title: { type: String, default: '⚠️ 确认操作' },
    lines: { type: Array, default: () => [] },
    confirmText: { type: String, default: '确认' },
    cancelText: { type: String, default: '取消' },
  });

  defineEmits(['cancel', 'confirm']);

  const normalizedLines = computed(() =>
    props.lines.length ? props.lines : ['确定要继续吗？']
  );
</script>

<style scoped>
  .confirm-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .confirm-dialog {
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .confirm-dialog h3 {
    margin: 0 0 16px 0;
    color: #dc3545;
    font-size: 18px;
  }

  .confirm-dialog p {
    margin: 0 0 12px 0;
    color: #495057;
    font-size: 14px;
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .confirm-btn {
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .confirm-btn:hover {
    background: #c82333;
  }

  .cancel-btn {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    background: #6c757d;
    color: white;
  }
</style>

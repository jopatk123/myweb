<template>
  <div
    v-if="modelValue"
    class="backdrop"
    @click.self="$emit('update:modelValue', false)"
  >
    <div class="dialog">
      <div class="title">{{ title }}</div>
      <div class="content">{{ message }}</div>
      <div class="actions">
        <button @click="$emit('update:modelValue', false)">取消</button>
        <button class="danger" @click="onConfirm">确认</button>
      </div>
    </div>
  </div>
</template>

<script setup>
  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '确认操作' },
    message: { type: String, default: '是否继续？' },
  });
  const emit = defineEmits(['update:modelValue', 'confirm']);
  function onConfirm() {
    emit('confirm');
    emit('update:modelValue', false);
  }
</script>

<style scoped>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2100;
  }
  .dialog {
    width: 360px;
    background: #fff;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }
  .title {
    font-weight: 600;
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
  }
  .content {
    padding: 16px;
    color: #333;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 10px 16px;
    border-top: 1px solid #eee;
  }
  button {
    padding: 6px 12px;
    border: 1px solid #ddd;
    background: #f9f9f9;
    border-radius: 6px;
    cursor: pointer;
  }
  .danger {
    background: #dc2626;
    color: #fff;
    border-color: #dc2626;
  }
</style>

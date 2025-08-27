<template>
  <div v-if="visible" class="confirm-dialog-overlay" @click="$emit('cancel')">
    <div class="confirm-dialog" @click.stop>
      <h3>⚠️ 确认清除留言板</h3>
      <p>此操作将永久删除所有留言和图片文件，无法恢复。</p>
      <p><strong>确定要继续吗？</strong></p>
      <div class="confirm-actions">
        <button @click="$emit('cancel')" class="cancel-btn">取消</button>
        <button @click="$emit('confirm')" class="confirm-clear-btn">确认清除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false }
});

defineEmits(['cancel', 'confirm']);
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

.confirm-clear-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.confirm-clear-btn:hover {
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

